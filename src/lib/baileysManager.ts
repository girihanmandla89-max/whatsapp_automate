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
import { generateGeminiReply } from "./geminiAgent";

// In-memory socket registry for multi-tenant clients (global singleton to survive Next.js Turbopack reloads)
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

const globalForSessions = globalThis as unknown as {
  whatsappSessions: Map<string, ActiveSession> | undefined;
};

const activeSessions: Map<string, ActiveSession> =
  globalForSessions.whatsappSessions ?? new Map();

if (process.env.NODE_ENV !== "production") {
  globalForSessions.whatsappSessions = activeSessions;
}

// Track reconnect attempts and timers per client to prevent stampedes
const reconnectAttempts: Map<string, number> = new Map();
const reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Cleanly terminates any active socket and clears its event listeners.
 */
function cleanupExistingSocket(session?: ActiveSession) {
  if (!session?.socket) return;
  try {
    session.socket.ev.removeAllListeners("connection.update");
    session.socket.ev.removeAllListeners("creds.update");
    session.socket.ev.removeAllListeners("messaging-history.set");
    session.socket.ev.removeAllListeners("messages.upsert");
    session.socket.end(undefined);
  } catch (err) {
    // Gracefully handle socket already closed
  }
}

/**
 * Initializes an isolated Baileys WhatsApp session for a specific Client Workspace.
 */
export async function initializeClientSession(
  clientId: string,
  usePairingCodePhone?: string,
  forceFreshSession: boolean = false
) {
  // If a reconnect timer is currently queued, clear it
  const existingTimer = reconnectTimers.get(clientId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    reconnectTimers.delete(clientId);
  }

  // If session is already running and connected, return current state
  const existing = activeSessions.get(clientId);
  if (existing && existing.status === "CONNECTED" && !forceFreshSession && !usePairingCodePhone) {
    return existing;
  }

  // Clean up any stale or half-open socket instance before creating a new one
  if (existing?.socket) {
    cleanupExistingSocket(existing);
    activeSessions.delete(clientId);
  }

  // Create client session folder under persistent data/sessions/
  const sessionDir = path.join(process.cwd(), "data", "sessions", `client_${clientId}`);
  
  // Inspect if existing session was ever registered. If unauthenticated, corrupted, or fresh request, wipe it.
  const credsPath = path.join(sessionDir, "creds.json");
  let isAlreadyRegistered = false;
  if (fs.existsSync(credsPath)) {
    try {
      const parsedCreds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
      isAlreadyRegistered = !!parsedCreds.registered;
    } catch (e) {
      isAlreadyRegistered = false;
    }
  }

  // Purge unauthenticated or requested fresh session directory completely
  if (forceFreshSession || usePairingCodePhone || !isAlreadyRegistered) {
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`[Baileys] Cleared unauthenticated/stale session directory for ${clientId}`);
      } catch (e) {
        console.warn("Could not clear sessionDir:", e);
      }
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
    // Production Browser Fingerprint accepted by all modern WhatsApp iOS/Android clients:
    browser: Browsers.ubuntu("Chrome"),
    syncFullHistory: true,
    generateHighQualityLinkPreview: true,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    markOnlineOnConnect: true,
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

  // If phone number provided, request 8-digit pairing code directly
  if (usePairingCodePhone && !sock.authState.creds.registered) {
    const cleanPhone = usePairingCodePhone.replace(/\D/g, "");
    // Wait for socket handshake, then request code
    const pairingPromise = new Promise<string | null>((resolve) => {
      setTimeout(async () => {
        try {
          const rawCode = await sock.requestPairingCode(cleanPhone);
          const formattedCode = rawCode ? rawCode.match(/.{1,4}/g)?.join("-") || rawCode : "";
          sessionRecord.rawPairingCode = rawCode;
          sessionRecord.pairingCode = formattedCode;
          sessionRecord.status = "QR_READY";
          console.log(`[Baileys] 8-Digit Pairing Code Generated for ${cleanPhone}: ${rawCode} (${formattedCode})`);
          resolve(formattedCode);
        } catch (err: any) {
          console.error(`[Baileys] Failed to generate pairing code for ${cleanPhone}:`, err?.message || err);
          resolve(null);
        }
      }, 1500);
    });

    // Wait for code generation so the calling HTTP endpoint returns it immediately
    await pairingPromise;
  }

  // Handle connection events
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Stream QR code as DataURL (only when phone pairing code wasn't requested)
    if (qr && !usePairingCodePhone) {
      sessionRecord.qrCodeDataUrl = await QRCode.toDataURL(qr, {
        margin: 2,
        width: 320,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      });
      sessionRecord.status = "QR_READY";
      console.log(`[Baileys] Fresh QR Generated for ${clientId}: ${qr.substring(0, 35)}...`);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const isRegistered = sock.authState?.creds?.registered;
      // Only auto-reconnect if already paired and registered to prevent infinite loops during initial linking
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && isRegistered;

      sessionRecord.status = "DISCONNECTED";
      sessionRecord.qrCodeDataUrl = null;
      sessionRecord.pairingCode = null;

      await prisma.clientWorkspace.updateMany({
        where: { id: clientId },
        data: { whatsappStatus: "DISCONNECTED" },
      });

      if (shouldReconnect) {
        const attempts = (reconnectAttempts.get(clientId) || 0) + 1;
        reconnectAttempts.set(clientId, attempts);
        // Exponential backoff: 3s, 6s, 12s, capped at 30s
        const backoffMs = Math.min(3000 * Math.pow(2, attempts - 1), 30000);
        console.log(`Connection dropped for client ${clientId} (code: ${statusCode}, attempt ${attempts}). Auto-reconnecting in ${backoffMs / 1000}s...`);

        const timer = setTimeout(() => {
          reconnectTimers.delete(clientId);
          initializeClientSession(clientId);
        }, backoffMs);
        reconnectTimers.set(clientId, timer);
      } else {
        console.log(`Client ${clientId} disconnected or logged out (code: ${statusCode}).`);
        reconnectAttempts.delete(clientId);
        cleanupExistingSocket(sessionRecord);
        activeSessions.delete(clientId);
        if (statusCode === DisconnectReason.loggedOut && fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
      }
    } else if (connection === "open") {
      // Reset reconnection attempt counter on successful handshake
      reconnectAttempts.delete(clientId);
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
    
    // Step 1: Pre-filter valid 1-to-1 WhatsApp messages and extract payload text
    interface ParsedSyncMessage {
      jid: string;
      customerPhone: string;
      customerName: string;
      text: string;
      senderType: "HUMAN_AGENT" | "CUSTOMER";
      timestamp: Date;
    }

    const validMessages: ParsedSyncMessage[] = [];
    const contactMap = new Map<string, { phone: string; name: string; lastSeen: Date }>();

    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      // Strictly accept 1-to-1 contacts (@s.whatsapp.net or @lid) and discard broadcast/groups/newsletters
      if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast" || jid.endsWith("@newsletter")) {
        continue;
      }

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        msg.message?.documentMessage?.caption ||
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg.message?.templateButtonReplyMessage?.selectedId ||
        "";

      if (!text || !text.trim()) continue;

      const rawPhone = jid.split("@")[0].split(":")[0].replace(/\D/g, "");
      if (!rawPhone || rawPhone.length < 6) continue;

      const customerPhone = `+${rawPhone}`;
      const customerName = msg.pushName || `Customer (+${rawPhone.slice(-4)})`;
      const senderType = msg.key.fromMe ? "HUMAN_AGENT" : "CUSTOMER";
      const timestamp = new Date(Number(msg.messageTimestamp || Date.now() / 1000) * 1000);

      validMessages.push({
        jid,
        customerPhone,
        customerName,
        text: text.trim(),
        senderType,
        timestamp,
      });

      // Update latest contact timestamp in memory
      const existing = contactMap.get(customerPhone);
      if (!existing || timestamp > existing.lastSeen) {
        contactMap.set(customerPhone, {
          phone: customerPhone,
          name: customerName,
          lastSeen: timestamp,
        });
      }
    }

    console.log(`[Baileys] Processed ${validMessages.length} valid 1-to-1 messages across ${contactMap.size} unique contacts.`);

    // Step 2: Ingest contacts in an async background queue to prevent blocking the socket keep-alive
    const contactIdMap = new Map<string, string>();
    for (const [phone, info] of contactMap.entries()) {
      try {
        const contact = await prisma.contact.upsert({
          where: { clientId_phoneNumber: { clientId, phoneNumber: phone } },
          update: {
            name: info.name,
            lastInteraction: info.lastSeen,
          },
          create: {
            clientId,
            phoneNumber: phone,
            name: info.name,
            tags: "WHATSAPP_SYNCED",
            lastInteraction: info.lastSeen,
          },
        });
        contactIdMap.set(phone, contact.id);
      } catch (cErr) {
        // Continue processing other contacts
      }
    }

    // Step 3: Insert messages in non-blocking chunks of 50 to prevent SQLite locks & event loop starvation
    const CHUNK_SIZE = 50;
    for (let i = 0; i < validMessages.length; i += CHUNK_SIZE) {
      const chunk = validMessages.slice(i, i + CHUNK_SIZE);
      await new Promise<void>((resolve) => {
        setImmediate(async () => {
          try {
            await prisma.$transaction(
              chunk
                .filter((m) => contactIdMap.has(m.customerPhone))
                .map((m) =>
                  prisma.chatMessage.create({
                    data: {
                      clientId,
                      contactId: contactIdMap.get(m.customerPhone)!,
                      senderType: m.senderType,
                      messageBody: m.text,
                      timestamp: m.timestamp,
                    },
                  })
                )
            );
          } catch (tErr) {
            // Non-fatal chunk error
          }
          resolve();
        });
      });
    }

    console.log(`[Baileys] Historical chat ingestion completed for client ${clientId}.`);
  });

  // Inbound real-time message dispatcher
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      const senderJid = msg.key.remoteJid;
      if (!senderJid || senderJid.endsWith("@g.us") || senderJid === "status@broadcast" || senderJid.endsWith("@newsletter")) continue;

      // Extract text from all potential WhatsApp message formats:
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        msg.message.documentMessage?.caption ||
        msg.message.buttonsResponseMessage?.selectedButtonId ||
        msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg.message.templateButtonReplyMessage?.selectedId ||
        "";

      if (!text || !text.trim()) continue;

      const rawPhone = senderJid.split("@")[0].split(":")[0].replace(/\D/g, "");
      if (!rawPhone || rawPhone.length < 6) continue;

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
            isHumanTakeover: contact.isUnsubscribed || false,
          },
        });

        // If the customer sent the message and human takeover is NOT active, trigger Gemini AI
        if (!msg.key.fromMe) {
          // Check if latest message in thread is Human Takeover
          const lastHumanMsg = await prisma.chatMessage.findFirst({
            where: { contactId: contact.id, isHumanTakeover: true },
            orderBy: { timestamp: "desc" },
          });

          const isTakeoverActive = !!lastHumanMsg?.isHumanTakeover;

          if (!isTakeoverActive) {
            // Asynchronously generate AI response
            setTimeout(async () => {
              try {
                const aiResult = await generateGeminiReply(clientId, contact.id, text);
                if (aiResult?.replyText) {
                  // Save AI message to DB
                  await prisma.chatMessage.create({
                    data: {
                      clientId,
                      contactId: contact.id,
                      senderType: "AI_AGENT",
                      messageBody: aiResult.replyText,
                      isHumanTakeover: aiResult.isEscalated,
                    },
                  });

                  // Dispatch outbound WhatsApp message to the customer
                  await sendHumanizedMessage(clientId, senderJid, aiResult.replyText);
                  console.log(`[Baileys] Dispatched AI reply to ${customerPhone}: "${aiResult.replyText.substring(0, 40)}..."`);
                }
              } catch (aiErr) {
                console.error(`[Baileys] Error processing AI reply for ${customerPhone}:`, aiErr);
              }
            }, 1000);
          } else {
            console.log(`[Baileys] Skipping AI reply for ${customerPhone} (Human Takeover is active).`);
          }
        }
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
