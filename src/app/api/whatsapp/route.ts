import { NextResponse } from "next/server";
import {
  initializeClientSession,
  getClientSession,
  disconnectClientSession,
  sendHumanizedMessage,
} from "@/lib/baileysManager";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || "default-client-1";

  const session = getClientSession(clientId);
  if (!session) {
    return NextResponse.json({
      status: "DISCONNECTED",
      qrCodeDataUrl: null,
      pairingCode: null,
      rawPairingCode: null,
      deviceInfo: {},
    });
  }

  return NextResponse.json({
    status: session.status,
    qrCodeDataUrl: session.qrCodeDataUrl,
    pairingCode: session.pairingCode,
    rawPairingCode: session.rawPairingCode,
    deviceInfo: session.deviceInfo,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientId = body.clientId || "default-client-1";

    // Action 1: Start or Request QR / Pairing Code
    if (body.action === "connect") {
      const session = await initializeClientSession(clientId, body.phoneNumber);
      return NextResponse.json({
        status: session.status,
        qrCodeDataUrl: session.qrCodeDataUrl,
        pairingCode: session.pairingCode,
        rawPairingCode: session.rawPairingCode,
      });
    }

    // Action 2: Disconnect Session
    if (body.action === "disconnect") {
      const success = await disconnectClientSession(clientId);
      return NextResponse.json({ success });
    }

    // Action 3: Send Test Message
    if (body.action === "send") {
      const targetJid = body.targetPhone.includes("@") ? body.targetPhone : `${body.targetPhone.replace(/\D/g, "")}@s.whatsapp.net`;
      const res = await sendHumanizedMessage(clientId, targetJid, body.message);
      return NextResponse.json({ success: true, messageId: res?.key?.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
