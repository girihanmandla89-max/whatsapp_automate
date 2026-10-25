import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || "default-client-1";

  // Download CSV / Excel Contact Import Template
  if (searchParams.get("template") === "true") {
    const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const sampleRows = [
      {
        "Phone Number": "+919876543210",
        "Full Name": "Rahul Sharma",
        "Tags": "VIP, REAL_ESTATE_3BHK",
        "Lead Quality": "HOT",
      },
      {
        "Phone Number": "+919812345678",
        "Full Name": "Priya Patel",
        "Tags": "CLINIC_PATIENT",
        "Lead Quality": "WARM",
      },
      {
        "Phone Number": "+14155552671",
        "Full Name": "John Smith",
        "Tags": "RETAIL_BUYER",
        "Lead Quality": "COLD",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 25 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts_Template");

    if (format === "csv") {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      return new Response(csvOutput, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="nexus_contacts_template.csv"',
        },
      });
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="nexus_contacts_template.xlsx"',
      },
    });
  }

  // Fetch client contacts
  const contacts = await prisma.contact.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalCount = await prisma.contact.count({ where: { clientId } });

  return NextResponse.json({ contacts, totalCount });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = (formData.get("clientId") as string) || "default-client-1";
    const defaultTag = (formData.get("defaultTag") as string) || "BULK_IMPORT";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rawRows) {
      // Flexible column key matching
      const phoneRaw =
        row["Phone Number"] ||
        row["phone"] ||
        row["Mobile"] ||
        row["phoneNumber"] ||
        row["Phone"] ||
        "";

      const name =
        row["Full Name"] ||
        row["name"] ||
        row["Customer Name"] ||
        row["Name"] ||
        "Imported Contact";

      const customTags = row["Tags"] || row["tags"] || defaultTag;
      const leadQuality = row["Lead Quality"] || row["score"] || "WARM";

      // Normalize phone number (must have digits)
      const cleanedPhone = String(phoneRaw).replace(/\D/g, "");
      if (!cleanedPhone || cleanedPhone.length < 7) {
        skippedCount++;
        continue;
      }

      // Format with international plus prefix if missing
      const formattedPhone = phoneRaw.toString().trim().startsWith("+")
        ? phoneRaw.toString().trim()
        : `+${cleanedPhone}`;

      try {
        await prisma.contact.upsert({
          where: {
            clientId_phoneNumber: {
              clientId,
              phoneNumber: formattedPhone,
            },
          },
          update: {
            name,
            tags: customTags,
            leadScore: leadQuality,
          },
          create: {
            clientId,
            phoneNumber: formattedPhone,
            name,
            tags: customTags,
            leadScore: leadQuality,
          },
        });
        importedCount++;
      } catch (err) {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      totalProcessed: rawRows.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
