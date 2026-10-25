import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secretKey = searchParams.get("key");
    const clientId = searchParams.get("clientId") || "default-client-1";

    // Optional verification secret check
    if (secretKey && secretKey !== "nexus_lead_secret_9981") {
      return NextResponse.json({ error: "Invalid webhook key" }, { status: 401 });
    }

    const body = await req.json();

    // Flexible extraction from Facebook Lead Ads / Web forms / Zapier / Google Sheet webhooks
    const rawPhone =
      body.phone ||
      body.phoneNumber ||
      body.mobile ||
      body.contact_number ||
      body["Phone Number"] ||
      "";

    const name =
      body.name ||
      body.fullName ||
      body.customer_name ||
      body["Full Name"] ||
      "Inbound Web Lead";

    const tag = body.tag || body.source || "DAILY_NEW_LEAD";
    const leadScore = body.score || "HOT";

    const cleaned = String(rawPhone).replace(/\D/g, "");
    if (!cleaned || cleaned.length < 7) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const formattedPhone = rawPhone.toString().trim().startsWith("+")
      ? rawPhone.toString().trim()
      : `+${cleaned}`;

    // Atomically upsert contact into SQLite
    const contact = await prisma.contact.upsert({
      where: {
        clientId_phoneNumber: {
          clientId,
          phoneNumber: formattedPhone,
        },
      },
      update: {
        name,
        tags: tag,
        leadScore,
        lastInteraction: new Date(),
      },
      create: {
        clientId,
        phoneNumber: formattedPhone,
        name,
        tags: tag,
        leadScore,
      },
    });

    console.log(`[Auto-Lead Ingested] ${name} (${formattedPhone}) for client ${clientId}`);

    return NextResponse.json({
      success: true,
      message: "Lead received and saved to SQLite.",
      contactId: contact.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
