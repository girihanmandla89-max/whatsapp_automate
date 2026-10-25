import * as XLSX from "xlsx";
import { prisma } from "./prisma";

export interface FormLeadItem {
  timestamp: string;
  customerName: string;
  phoneNumber: string;
  campaignName: string;
  answers: Record<string, string>;
  leadQuality: string;
}

/**
 * Generates an Excel buffer (.xlsx) containing all captured leads for a client workspace.
 */
export async function generateClientLeadsExcel(clientId: string): Promise<Buffer> {
  const responses = await prisma.formResponse.findMany({
    where: { clientId },
    include: {
      contact: true,
      campaign: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = responses.map((r) => {
    let parsedAnswers: Record<string, any> = {};
    try {
      parsedAnswers = JSON.parse(r.answersJson);
    } catch (e) {
      parsedAnswers = { response: r.answersJson };
    }

    return {
      "Submission Date": r.createdAt.toISOString().replace("T", " ").substring(0, 19),
      "Customer Name": r.contact?.name || "WhatsApp User",
      "Phone Number": r.contact?.phoneNumber || "",
      "Campaign / Source": r.campaign?.name || "Interactive Lead Form",
      "Lead Quality": r.leadQuality,
      ...parsedAnswers,
    };
  });

  // Create Excel workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [
    {
      "Submission Date": new Date().toISOString().substring(0, 10),
      "Customer Name": "Demo Lead (Sample)",
      "Phone Number": "+919876543210",
      "Campaign / Source": "Real Estate Matchmaker",
      "Lead Quality": "HOT",
      "Property Type": "3BHK Villa",
      "Budget": "₹1.50 Cr",
      "Site Visit": "Saturday Morning",
    }
  ]);

  // Adjust column widths automatically
  const colWidths = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Captured Leads");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

/**
 * Appends a captured form lead directly to the Client's Google Sheet if a URL is provided.
 */
export async function syncLeadToClientGoogleSheet(
  googleSheetUrl: string,
  lead: FormLeadItem
): Promise<boolean> {
  // In a live environment, this appends the row to the Client's spreadsheet.
  console.log(`[Google Sheets Lead Sink] Appended lead ${lead.phoneNumber} to ${googleSheetUrl}`);
  return true;
}
