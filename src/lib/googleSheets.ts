import { google } from "googleapis";

// Google Sheets Licensing & Telemetry Config
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

export interface SheetLicenseRecord {
  licenseKey: string;
  licenseType: "SUPER_ADMIN" | "ADMIN";
  ownerEmail: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  boundFingerprint: string;
  features: string;
  maxClients: number;
  monthlyMsgCap: number;
  validUntil: string;
  signature: string;
}

export interface TelemetryReport {
  licenseKey: string;
  adminEmail: string;
  activeClientsCount: number;
  connectedNumbers: number;
  totalUniqueUsersServed: number;
  messagesSentMonth: number;
  geminiTokensUsed: number;
  lastActivePing: string;
  billableEstimate: string;
}

function getSheetsClient() {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

/**
 * Fetches and parses all license records from Tab 1 ("Licenses") in the master Google Sheet.
 */
export async function fetchLicensesFromSheet(): Promise<SheetLicenseRecord[]> {
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) {
    // Return empty array if Google Sheet credentials are not configured in .env yet
    return [];
  }

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Licenses!A2:J", // Assumes headers on Row 1
    });

    const rows = res.data.values || [];
    return rows.map((row) => ({
      licenseKey: row[0] || "",
      licenseType: (row[1]?.toUpperCase() === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN") as "SUPER_ADMIN" | "ADMIN",
      ownerEmail: row[2] || "",
      status: (row[3]?.toUpperCase() || "ACTIVE") as "ACTIVE" | "SUSPENDED" | "EXPIRED",
      boundFingerprint: row[4] || "",
      features: row[5] || "CORE,BROADCAST",
      maxClients: parseInt(row[6], 10) || 1,
      monthlyMsgCap: parseInt(row[7], 10) || 10000,
      validUntil: row[8] || "2030-12-31",
      signature: row[9] || "",
    }));
  } catch (err) {
    console.error("Error fetching licenses from Google Sheets:", err);
    return [];
  }
}

/**
 * Binds the machine fingerprint to the license row in Google Sheets upon initial verification.
 */
export async function bindFingerprintToSheet(licenseKey: string, fingerprint: string): Promise<boolean> {
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) return false;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Licenses!A2:E",
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0]?.trim() === licenseKey.trim());
    if (rowIndex === -1) return false;

    const sheetRowNumber = rowIndex + 2; // Accounting for 1-based index and header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Licenses!E${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[fingerprint]],
      },
    });

    return true;
  } catch (err) {
    console.error("Failed to bind fingerprint in Google Sheets:", err);
    return false;
  }
}

/**
 * Appends or updates usage metrics in Tab 2 ("Usage_Telemetry") for billing.
 */
export async function pushUsageTelemetryToSheet(report: TelemetryReport): Promise<boolean> {
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) return false;

  try {
    const rowValues = [
      report.licenseKey,
      report.adminEmail,
      report.activeClientsCount,
      report.connectedNumbers,
      report.totalUniqueUsersServed,
      report.messagesSentMonth,
      report.geminiTokensUsed,
      report.lastActivePing,
      report.billableEstimate,
    ];

    // Check if license already exists in Telemetry tab
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Usage_Telemetry!A2:A",
    });

    const existingKeys = (res.data.values || []).map((r) => r[0]);
    const existingIndex = existingKeys.findIndex((k) => k?.trim() === report.licenseKey.trim());

    if (existingIndex !== -1) {
      // Update existing row
      const targetRow = existingIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Usage_Telemetry!A${targetRow}:I${targetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: "Usage_Telemetry!A:I",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues],
        },
      });
    }

    return true;
  } catch (err) {
    console.error("Failed to push telemetry to Google Sheet:", err);
    return false;
  }
}

/**
 * Fetches all telemetry metrics for all admins from Tab 2 ("Usage_Telemetry").
 */
export async function fetchTelemetryFromSheet(): Promise<TelemetryReport[]> {
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) return [];

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Usage_Telemetry!A2:I",
    });

    const rows = res.data.values || [];
    return rows.map((r) => ({
      licenseKey: r[0] || "",
      adminEmail: r[1] || "",
      activeClientsCount: parseInt(r[2], 10) || 0,
      connectedNumbers: parseInt(r[3], 10) || 0,
      totalUniqueUsersServed: parseInt(r[4], 10) || 0,
      messagesSentMonth: parseInt(r[5], 10) || 0,
      geminiTokensUsed: parseInt(r[6], 10) || 0,
      lastActivePing: r[7] || "",
      billableEstimate: r[8] || "$0.00",
    }));
  } catch (err) {
    console.error("Failed to fetch telemetry from Google Sheets:", err);
    return [];
  }
}

/**
 * Modifies an existing license row in Google Sheets (Status, Limits, Expiry, Features, Signature).
 */
export async function updateLicenseInSheet(
  licenseKey: string,
  updatedFields: Partial<SheetLicenseRecord>
): Promise<boolean> {
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) return false;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Licenses!A2:J",
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0]?.trim() === licenseKey.trim());
    if (rowIndex === -1) return false;

    const currentRow = rows[rowIndex];
    const targetRow = rowIndex + 2;

    const newRow = [
      licenseKey,
      updatedFields.licenseType !== undefined ? updatedFields.licenseType : currentRow[1],
      updatedFields.ownerEmail !== undefined ? updatedFields.ownerEmail : currentRow[2],
      updatedFields.status !== undefined ? updatedFields.status : currentRow[3],
      updatedFields.boundFingerprint !== undefined ? updatedFields.boundFingerprint : currentRow[4],
      updatedFields.features !== undefined ? updatedFields.features : currentRow[5],
      updatedFields.maxClients !== undefined ? String(updatedFields.maxClients) : currentRow[6],
      updatedFields.monthlyMsgCap !== undefined ? String(updatedFields.monthlyMsgCap) : currentRow[7],
      updatedFields.validUntil !== undefined ? updatedFields.validUntil : currentRow[8],
      updatedFields.signature !== undefined ? updatedFields.signature : currentRow[9],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Licenses!A${targetRow}:J${targetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [newRow],
      },
    });

    return true;
  } catch (err) {
    console.error("Failed to update license in Google Sheets:", err);
    return false;
  }
}

/**
 * Deletes a license row in Google Sheets (clears row or marks as REVOKED).
 */
export async function deleteLicenseInSheet(licenseKey: string): Promise<boolean> {
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) return false;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Licenses!A2:A",
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0]?.trim() === licenseKey.trim());
    if (rowIndex === -1) return false;

    const targetRow = rowIndex + 2;
    await sheets.spreadsheets.values.clear({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Licenses!A${targetRow}:J${targetRow}`,
    });

    return true;
  } catch (err) {
    console.error("Failed to delete license from Google Sheets:", err);
    return false;
  }
}
