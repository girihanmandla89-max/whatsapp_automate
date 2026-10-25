import { NextResponse } from "next/server";
import { generateGeminiReply, PERSONA_PRESETS } from "@/lib/geminiAgent";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || "default-client-1";

  // Get client AI settings and available persona presets
  const client = await prisma.clientWorkspace.findUnique({
    where: { id: clientId },
  });

  return NextResponse.json({
    systemPrompt: client?.systemPrompt || PERSONA_PRESETS.REAL_ESTATE.systemPrompt,
    knowledgeContext: client?.knowledgeContext || "",
    presets: PERSONA_PRESETS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientId = body.clientId || "default-client-1";

    // Action 1: Update Client AI Persona, Knowledge Base & Dedicated API Key
    if (body.action === "update_settings") {
      await (prisma.clientWorkspace as any).upsert({
        where: { id: clientId },
        update: {
          systemPrompt: body.systemPrompt,
          knowledgeContext: body.knowledgeContext,
          geminiApiKey: body.geminiApiKey || null,
          geminiModel: body.geminiModel || "gemini-2.5-flash",
        },
        create: {
          id: clientId,
          name: "Default Client Workspace",
          systemPrompt: body.systemPrompt,
          knowledgeContext: body.knowledgeContext,
          geminiApiKey: body.geminiApiKey || null,
          geminiModel: body.geminiModel || "gemini-2.5-flash",
        },
      });
      return NextResponse.json({ success: true });
    }

    // Action 2: Simulate / Test Gemini Agent Response
    if (body.action === "simulate") {
      const contactId = body.contactId || "simulated-test-contact";
      const result = await generateGeminiReply(clientId, contactId, body.message);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
