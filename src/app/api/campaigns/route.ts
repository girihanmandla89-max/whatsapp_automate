import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateClientLeadsExcel } from "@/lib/excelExporter";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || "default-client-1";
  const downloadExcel = searchParams.get("download") === "true";

  // Action: Download Excel file (.xlsx)
  if (downloadExcel) {
    const buffer = await generateClientLeadsExcel(clientId);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="leads_${clientId}_${new Date().toISOString().substring(0, 10)}.xlsx"`,
      },
    });
  }

  // Action: Fetch campaigns & captured responses
  const campaigns = await prisma.campaign.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  const responses = await prisma.formResponse.findMany({
    where: { clientId },
    include: {
      contact: true,
      campaign: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ campaigns, responses });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientId = body.clientId || "default-client-1";

    // Action 1: Create a new Campaign / Interactive Form
    if (body.action === "create_campaign") {
      const campaign = await prisma.campaign.create({
        data: {
          clientId,
          name: body.name,
          campaignType: body.campaignType || "FORM_LEAD",
          messageBody: body.messageBody,
          interactiveType: body.interactiveType || "QUICK_REPLY_BUTTONS",
          interactiveData: JSON.stringify(body.interactiveData || []),
          status: "RUNNING",
        },
      });
      return NextResponse.json({ success: true, campaign });
    }

    // Action 2: Simulate Lead Submission & Instant Excel Capture
    if (body.action === "simulate_submission") {
      const contact = await prisma.contact.upsert({
        where: {
          clientId_phoneNumber: {
            clientId,
            phoneNumber: body.phoneNumber || "+919876543210",
          },
        },
        update: {
          name: body.customerName || "Simulated Lead",
          leadScore: body.leadQuality || "HOT",
          lastInteraction: new Date(),
        },
        create: {
          clientId,
          phoneNumber: body.phoneNumber || "+919876543210",
          name: body.customerName || "Simulated Lead",
          leadScore: body.leadQuality || "HOT",
          tags: "CAMPAIGN_LEAD",
        },
      });

      const response = await prisma.formResponse.create({
        data: {
          clientId,
          campaignId: body.campaignId || null,
          contactId: contact.id,
          answersJson: JSON.stringify(body.answers || {}),
          leadQuality: body.leadQuality || "HOT",
        },
      });

      return NextResponse.json({ success: true, response });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
