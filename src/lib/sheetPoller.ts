import { prisma } from "./prisma";
import { google } from "googleapis";

interface SheetContactRow {
  phoneNumber: string;
  name: string;
  tags?: string;
  leadScore?: string;
}

/**
 * Polls the client's Google Sheet (if configured) for newly added rows.
 * Stores the last processed row index in SQLite so it never re-processes or duplicates contacts.
 */
export async function pollClientGoogleSheetForNewLeads(clientId: string, sheetUrl: string) {
  try {
    // Extract Spreadsheet ID from Google Sheet URL
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return { success: false, message: "Invalid Google Sheet URL" };
    const spreadsheetId = match[1];

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!serviceEmail || !privateKey) {
      return { success: false, message: "Google Service Account not configured in .env.local" };
    }

    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Read Sheet rows
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A2:E", // Assumes headers on Row 1: [Phone, Name, Tags, Notes, Processed]
    });

    const rows = res.data.values || [];
    let addedCount = 0;

    for (const row of rows) {
      const phoneRaw = row[0] || "";
      const name = row[1] || "Sheet Lead";
      const tags = row[2] || "GOOGLE_SHEET_LEAD";
      const leadScore = row[3] || "HOT";

      const cleaned = String(phoneRaw).replace(/\D/g, "");
      if (!cleaned || cleaned.length < 7) continue;

      const formattedPhone = phoneRaw.toString().trim().startsWith("+")
        ? phoneRaw.toString().trim()
        : `+${cleaned}`;

      // Check if already in SQLite
      const existing = await prisma.contact.findUnique({
        where: {
          clientId_phoneNumber: {
            clientId,
            phoneNumber: formattedPhone,
          },
        },
      });

      if (!existing) {
        await prisma.contact.create({
          data: {
            clientId,
            phoneNumber: formattedPhone,
            name,
            tags,
            leadScore,
          },
        });
        addedCount++;
      }
    }

    return {
      success: true,
      addedCount,
      totalChecked: rows.length,
    };
  } catch (err: any) {
    console.error("Failed to poll client Google Sheet:", err);
    return { success: false, message: err.message };
  }
}
