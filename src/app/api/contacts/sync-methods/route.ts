import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pollClientGoogleSheetForNewLeads } from "@/lib/sheetPoller";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientId = body.clientId || "default-client-1";

    // Action 1: Save or Update Method Settings (Google Sheet URL, Webhook Secret, etc.)
    if (body.action === "save_method_settings") {
      await prisma.clientWorkspace.upsert({
        where: { id: clientId },
        update: {
          googleSheetUrl: body.googleSheetUrl,
        },
        create: {
          id: clientId,
          name: "Default Client Workspace",
          googleSheetUrl: body.googleSheetUrl,
        },
      });

      return NextResponse.json({ success: true, googleSheetUrl: body.googleSheetUrl });
    }

    // Action 2: Trigger Manual or Background Google Sheet Polling
    if (body.action === "sync_sheet_now") {
      const client = await prisma.clientWorkspace.findUnique({
        where: { id: clientId },
      });

      const sheetUrl = body.googleSheetUrl || client?.googleSheetUrl;
      if (!sheetUrl) {
        return NextResponse.json({
          success: false,
          message: "Please enter and save a valid Google Sheet URL first.",
        });
      }

      const result = await pollClientGoogleSheetForNewLeads(clientId, sheetUrl);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
