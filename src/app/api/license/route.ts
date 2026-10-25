import { NextResponse } from "next/server";
import { validateLicense, syncTelemetryBatch } from "@/lib/licenseEngine";
import { generateLicenseSignature, LicensePayload } from "@/lib/cryptoLicense";
import {
  fetchLicensesFromSheet,
  fetchTelemetryFromSheet,
  updateLicenseInSheet,
  deleteLicenseInSheet,
} from "@/lib/googleSheets";

export async function GET() {
  const result = await validateLicense();
  const allLicenses = await fetchLicensesFromSheet();
  const allTelemetry = await fetchTelemetryFromSheet();
  return NextResponse.json({ result, allLicenses, allTelemetry });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Action 1: Verify / Activate a new License Key
    if (body.action === "activate") {
      const result = await validateLicense(body.licenseKey);
      return NextResponse.json(result);
    }

    // Action 2: Trigger Manual Telemetry Sync
    if (body.action === "sync_telemetry") {
      const success = await syncTelemetryBatch();
      return NextResponse.json({ success });
    }

    // Action 3: Super Admin License Generator Tool (Computes HMAC signature for Google Sheet)
    if (body.action === "generate_signature") {
      const payload: LicensePayload = {
        licenseKey: body.licenseKey,
        licenseType: body.licenseType,
        ownerEmail: body.ownerEmail,
        maxClients: Number(body.maxClients) || 1,
        monthlyMsgCap: Number(body.monthlyMsgCap) || 10000,
        validUntil: body.validUntil,
        features: body.features || "CORE,BAILEYS,GEMINI,BROADCAST",
      };

      const signature = generateLicenseSignature(payload);
      return NextResponse.json({
        payload,
        signature,
        rowValues: [
          payload.licenseKey,
          payload.licenseType,
          payload.ownerEmail,
          "ACTIVE",
          "", // Initially empty bound_fingerprint (bound on first boot)
          payload.features,
          payload.maxClients,
          payload.monthlyMsgCap,
          payload.validUntil,
          signature,
        ],
      });
    }

    // Action 4: Modify Existing License (Hold/Suspend, Upgrade, Downgrade, Extend, Reset Hardware Lock)
    if (body.action === "modify_license") {
      const payload: LicensePayload = {
        licenseKey: body.licenseKey,
        licenseType: body.licenseType,
        ownerEmail: body.ownerEmail,
        maxClients: Number(body.maxClients),
        monthlyMsgCap: Number(body.monthlyMsgCap),
        validUntil: body.validUntil,
        features: body.features || "CORE,BAILEYS,GEMINI,BROADCAST",
      };

      // Automatically recompute cryptographic signature so Google Sheet remains valid
      const newSignature = generateLicenseSignature(payload);

      const success = await updateLicenseInSheet(body.licenseKey, {
        status: body.status,
        licenseType: body.licenseType,
        maxClients: Number(body.maxClients),
        monthlyMsgCap: Number(body.monthlyMsgCap),
        validUntil: body.validUntil,
        features: body.features,
        boundFingerprint: body.resetHardware ? "" : undefined,
        signature: newSignature,
      });

      return NextResponse.json({ success, newSignature });
    }

    // Action 5: Delete / Revoke License from Google Sheets
    if (body.action === "delete_license") {
      const success = await deleteLicenseInSheet(body.licenseKey);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
