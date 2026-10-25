import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  Browsers,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { prisma } from "./prisma";

// In-memory socket registry for multi-tenant clients
interface ActiveSession {
  clientId: string;
  socket: WASocket;
  qrCodeDataUrl: string | null;
  pairingCode: string | null;
  rawPairingCode: string | null;
  status: "INITIALIZING" | "QR_READY" | "CONNECTED" | "DISCONNECTED";
  deviceInfo: {
    phoneNumber?: string;
    name?: string;
    platform?: string;
    battery?: number;
  };
}

const activeSessions: Map<string, ActiveSession> = new Map();

/**
 * Initializes an isolated Baileys WhatsApp session for a specific Client Workspace.
 */
export async function initializeClientSession(clientId: string, usePairingCodePhone?: string) {
  // If session already running and connected, return current state
  const existing = activeSessions.get(clientId);
  if (existing && existing.status === "CONNECTED") {
    return existing;
  }

  // Create client session folder under persistent data/sessions/
  const sessionDir = path.join(process.cwd(), "data", "sessions", `client_${clientId}`);
  
  // If requesting a new pairing code or fresh session, clear unauthenticated session data first
  if (usePairingCodePhone && fs.existsSync(sessionDir)) {
    try {
      if (existing?.socket) {
        existing.socket.end(undefined);
      }
      activeSessions.delete(clientId);
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Could not clear sessionDir:", e);
    }
  }

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: "silent" });

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    // WhatsApp's pairing-code handshake strictly requires an official client identifier:
    browser: Browsers.macOS("Desktop"),
    syncFullHistory: true,
    generateHighQualityLinkPreview: true,
  });

  const sessionRecord: ActiveSession = {
    clientId,
    socket: sock,
    qrCodeDataUrl: null,
    pairingCode: null,
    rawPairingCode: null,
    status: "INITIALIZING",
    deviceInfo: {},
  };

  activeSessions.set(clientId, sessionRecord);

  // If phone number provided, request 8-digit pairing code once socket is initialized
  if (usePairingCodePhone && !sock.authState.creds.registered) {
    const cleanPhone = usePairingCodePhone.replace(/\D/g, "");
    setTimeout(async () => {
      try {
        const rawCode = await sock.requestPairingCode(cleanPhone);
        const formattedCode = rawCode ? rawCode.match(/.{1,4}/g)?.join("-") || rawCode : "";
        sessionRecord.rawPairingCode = rawCode;
        sessionRecord.pairingCode = formattedCode;
        sessionRecord.status = "QR_READY";
        console.log(`[Baileys] 8-Digit Pairing Code Generated for ${cleanPhone}: ${rawCode} (${formattedCode})`);
      } catch (err) {
        console.error(`[Baileys] Failed to generate pairing code for ${cleanPhone}:`, err);
      }
    }, 2500);
  }

  // Handle connection events
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Stream QR code as DataURL (only when phone pairing code wasn't requested)
    if (qr && !usePairingCodePhone) {
      sessionRecord.qrCodeDataUrl = await QRCode.toDataURL(qr, {
        margin: 2,
        width: 256,
        color: { dark: "#00f2fe", light: "#07090e" },
      });
      sessionRecord.status = "QR_READY";
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      sessionRecord.status = "DISCONNECTED";
      sessionRecord.qrCodeDataUrl = null;
      sessionRecord.pairingCode = null;

      await prisma.clientWorkspace.updateMany({
        where: { id: clientId },
        data: { whatsappStatus: "DISCONNECTED" },
      });

      if (shouldReconnect) {
        console.log(`Connection dropped for client ${clientId} (code: ${statusCode}). Auto-reconnecting in 3s...`);
        setTimeout(() => initializeClientSession(clientId), 3000);
      } else {
        console.log(`Client ${clientId} was logged out from WhatsApp.`);
        activeSessions.delete(clientId);
        // Purge session files if logged out to allow fresh pairing
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
      }
    } else if (connection === "open") {
      sessionRecord.status = "CONNECTED";
      sessionRecord.qrCodeDataUrl = null;
      sessionRecord.pairingCode = null;

      const userJid = sock.user?.id || "";
      const rawPhone = userJid.split(":")[0] || userJid.split("@")[0];

      sessionRecord.deviceInfo = {
        phoneNumber: `+${rawPhone}`,
        name: sock.user?.name || "Client WhatsApp",
        platform: "WhatsApp Multi-Device",
        battery: 92,
      };

      // Update workspace in SQLite
      await prisma.clientWorkspace.updateMany({
        where: { id: clientId },
        data: {
          whatsappStatus: "CONNECTED",
          phoneNumber: sessionRecord.deviceInfo.phoneNumber,
          devicePlatform: sessionRecord.deviceInfo.platform,
          deviceBattery: sessionRecord.deviceInfo.battery,
        },
      });

      console.log(`Client ${clientId} WhatsApp session connected successfully (+${rawPhone}).`);
    }
  });

  // Persist session credentials
  sock.ev.on("creds.update", saveCreds);

  // Sync historical chats when WhatsApp client sends historical dump
  sock.ev.on("messaging-history.set", async ({ chats, messages }) => {
    console.log(`[Baileys] Received chat history: ${chats.length} chats, ${messages.length} messages.`);
    for (const msg of messages) {
      try {
        const jid = msg.key.remoteJid;
        if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") continue;

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.buttonsResponseMessage?.selectedButtonId ||
          msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
          "";

        if (!text) continue;

        const rawPhone = jid.split("@")[0];
        const customerPhone = `+${rawPhone}`;
        const customerName = msg.pushName || `Customer (+${rawPhone.slice(-4)})`;
        const senderType = msg.key.fromMe ? "HUMAN_AGENT" : "CUSTOMER";

        const contact = await prisma.contact.upsert({
          where: {
            clientId_phoneNumber: { clientId, phoneNumber: customerPhone },
          },
          update: {
            name: customerName,
            lastInteraction: new Date(Number(msg.messageTimestamp || Date.now() / 1000) * 1000),
          },
          create: {
            clientId,
            phoneNumber: customerPhone,
            name: customerName,
            tags: "WHATSAPP_SYNCED",
          },
        });

        await prisma.chatMessage.create({
          data: {
            clientId,
            contactId: contact.id,
            senderType,
            messageBody: text,
            timestamp: new Date(Number(msg.messageTimestamp || Date.now() / 1000) * 1000),
          },
        });
      } catch (err) {
        // Continue processing other messages
      }
    }
  });

  // Inbound real-time message dispatcher
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      const senderJid = msg.key.remoteJid;
      if (!senderJid || senderJid.endsWith("@g.us") || senderJid === "status@broadcast") continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.buttonsResponseMessage?.selectedButtonId ||
        msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        "";

      if (!text) continue;

      const rawPhone = senderJid.split("@")[0];
      const customerPhone = `+${rawPhone}`;
      const customerName = msg.pushName || `Customer (+${rawPhone.slice(-4)})`;
      const senderType = msg.key.fromMe ? "HUMAN_AGENT" : "CUSTOMER";

      try {
        // Save/Find Contact in SQLite
        const contact = await prisma.contact.upsert({
          where: {
            clientId_phoneNumber: {
              clientId,
              phoneNumber: customerPhone,
            },
          },
          update: {
            name: customerName,
            lastInteraction: new Date(),
          },
          create: {
            clientId,
            phoneNumber: customerPhone,
            name: customerName,
            tags: "WHATSAPP_ACTIVE",
          },
        });

        // Save Inbound Message in SQLite
        await prisma.chatMessage.create({
          data: {
            clientId,
            contactId: contact.id,
            senderType,
            messageBody: text,
          },
        });
      } catch (err) {
        console.error("Error storing upsert message:", err);
      }
    }
  });

  return sessionRecord;
}

/**
 * Dispatches an outbound WhatsApp message with humanized typing simulation and randomized delay.
 */
export async function sendHumanizedMessage(clientId: string, targetJid: string, messageText: string) {
  const session = activeSessions.get(clientId);
  if (!session || session.status !== "CONNECTED") {
    throw new Error(`WhatsApp is not connected for client ${clientId}`);
  }

  // 1. Simulate Read Receipt
  await session.socket.readMessages([{ remoteJid: targetJid, id: undefined }]);

  // 2. Simulate Typing indicator for 2 to 4 seconds
  await session.socket.sendPresenceUpdate("composing", targetJid);
  const typingDelayMs = Math.floor(Math.random() * 2000) + 2000;
  await new Promise((res) => setTimeout(res, typingDelayMs));

  // 3. Pause typing indicator
  await session.socket.sendPresenceUpdate("paused", targetJid);

  // 4. Send message
  const sent = await session.socket.sendMessage(targetJid, { text: messageText });
  return sent;
}

/**
 * Gets the current active session state for a client.
 */
export function getClientSession(clientId: string) {
  return activeSessions.get(clientId) || null;
}

/**
 * Gracefully disconnects a client session.
 */
export async function disconnectClientSession(clientId: string) {
  const session = activeSessions.get(clientId);
  if (session) {
    try {
      await session.socket.logout();
    } catch (e) {
      // ignore if socket is already closed
    }
    activeSessions.delete(clientId);
  }

  // Clear directory
  const sessionDir = path.join(process.cwd(), "data", "sessions", `client_${clientId}`);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  await prisma.clientWorkspace.updateMany({
    where: { id: clientId },
    data: {
      whatsappStatus: "DISCONNECTED",
      phoneNumber: null,
      devicePlatform: null,
    },
  });
  return true;
}
