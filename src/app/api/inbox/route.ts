import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendHumanizedMessage } from "@/lib/baileysManager";
import { generateShadowDraft } from "@/lib/geminiAgent";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || "default-client-1";

  // Fetch all contacts with their latest message
  const contacts = await prisma.contact.findMany({
    where: { clientId },
    include: {
      chatMessages: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
    orderBy: { lastInteraction: "desc" },
  });

  return NextResponse.json({ contacts });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Action 1: Toggle Human Takeover on/off for a contact
    if (body.action === "toggle_takeover") {
      const contact = await prisma.contact.findUnique({
        where: { id: body.contactId },
      });

      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

      // Record a system message indicating takeover change
      const isTakeover = body.isHumanTakeover;
      await prisma.chatMessage.create({
        data: {
          clientId: contact.clientId,
          contactId: contact.id,
          senderType: "SYSTEM",
          messageBody: isTakeover
            ? "👤 Human Agent has taken over this conversation. AI Auto-Reply is paused."
            : "🤖 AI Auto-Reply has been resumed for this conversation.",
          isHumanTakeover: isTakeover,
        },
      });

      return NextResponse.json({ success: true, isHumanTakeover: isTakeover });
    }

    // Action 2: Human Agent sends a manual message
    if (body.action === "send_manual") {
      const contact = await prisma.contact.findUnique({
        where: { id: body.contactId },
      });

      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

      // Save to SQLite
      const chatMsg = await prisma.chatMessage.create({
        data: {
          clientId: contact.clientId,
          contactId: contact.id,
          senderType: "HUMAN_AGENT",
          messageBody: body.messageText,
          isHumanTakeover: true,
        },
      });

      // Try sending via WhatsApp Baileys socket if connected
      const targetJid = `${contact.phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
      try {
        await sendHumanizedMessage(contact.clientId, targetJid, body.messageText);
      } catch (err) {
        // Socket may be offline in testing
      }

      return NextResponse.json({ success: true, message: chatMsg });
    }

    // Action 3: Fetch full message history for a specific contact
    if (body.action === "get_messages") {
      const messages = await prisma.chatMessage.findMany({
        where: { contactId: body.contactId },
        orderBy: { timestamp: "asc" },
      });
      return NextResponse.json({ messages });
    }

    // Action 4: Generate contextual AI suggested reply draft (Shadow Assist Mode)
    if (body.action === "suggest_draft") {
      const contact = await prisma.contact.findUnique({
        where: { id: body.contactId },
      });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

      const draft = await generateShadowDraft(contact.clientId, contact.id);
      return NextResponse.json({ success: true, draft });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
