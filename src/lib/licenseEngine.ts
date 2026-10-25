import { prisma } from "./prisma";
import {
  verifyLicenseSignature,
  getMachineFingerprint,
  LicensePayload,
} from "./cryptoLicense";
import {
  fetchLicensesFromSheet,
  bindFingerprintToSheet,
  pushUsageTelemetryToSheet,
  SheetLicenseRecord,
  TelemetryReport,
} from "./googleSheets";

export interface LicenseValidationResult {
  isValid: boolean;
  tier: "SUPER_ADMIN" | "ADMIN" | "UNLICENSED";
  message: string;
  maxClients: number;
  monthlyMsgCap: number;
  features: string[];
  ownerEmail?: string;
}

/**
 * Validates the license against local SQLite cache and remote Google Sheets.
 * Includes a 24-hour offline grace period if Google Sheets is momentarily unreachable.
 */
export async function validateLicense(providedKey?: string): Promise<LicenseValidationResult> {
  const currentFingerprint = getMachineFingerprint();

  // 1. Check local SQLite cache first (fast, sub-millisecond)
  const cached = await prisma.licenseCache.findUnique({
    where: { id: "singleton" },
  });

  const targetKey = providedKey || cached?.licenseKey;
  if (!targetKey) {
    return {
      isValid: false,
      tier: "UNLICENSED",
      message: "No license key found. Activation required.",
      maxClients: 0,
      monthlyMsgCap: 0,
      features: [],
    };
  }

  // 2. Fetch fresh record from Google Sheets
  const sheetRecords: SheetLicenseRecord[] = await fetchLicensesFromSheet();
  const remoteRecord = sheetRecords.find((r) => r.licenseKey.trim() === targetKey.trim());

  if (remoteRecord) {
    // A. Check Active Status
    if (remoteRecord.status !== "ACTIVE") {
      return {
        isValid: false,
        tier: "UNLICENSED",
        message: `License is ${remoteRecord.status}. Access blocked.`,
        maxClients: 0,
        monthlyMsgCap: 0,
        features: [],
      };
    }

    // B. Check Expiration Date
    const expiryDate = new Date(remoteRecord.validUntil);
    if (new Date() > expiryDate) {
      return {
        isValid: false,
        tier: "UNLICENSED",
        message: "License has expired. Please renew.",
        maxClients: 0,
        monthlyMsgCap: 0,
        features: [],
      };
    }

    // C. Verify Cryptographic HMAC Signature
    const payload: LicensePayload = {
      licenseKey: remoteRecord.licenseKey,
      licenseType: remoteRecord.licenseType,
      ownerEmail: remoteRecord.ownerEmail,
      maxClients: remoteRecord.maxClients,
      monthlyMsgCap: remoteRecord.monthlyMsgCap,
      validUntil: remoteRecord.validUntil,
      features: remoteRecord.features,
    };

    const isSigValid = verifyLicenseSignature(payload, remoteRecord.signature);
    if (!isSigValid) {
      return {
        isValid: false,
        tier: "UNLICENSED",
        message: "Cryptographic signature check failed. Data tampered with.",
        maxClients: 0,
        monthlyMsgCap: 0,
        features: [],
      };
    }

    // D. Hardware Fingerprint Binding
    if (!remoteRecord.boundFingerprint) {
      // First boot: bind this machine
      await bindFingerprintToSheet(remoteRecord.licenseKey, currentFingerprint);
    } else if (remoteRecord.boundFingerprint !== currentFingerprint) {
      return {
        isValid: false,
        tier: "UNLICENSED",
        message: "License is bound to another machine. Hardware lock violation.",
        maxClients: 0,
        monthlyMsgCap: 0,
        features: [],
      };
    }

    // E. Update local SQLite cache
    await prisma.licenseCache.upsert({
      where: { id: "singleton" },
      update: {
        licenseKey: remoteRecord.licenseKey,
        licenseType: remoteRecord.licenseType,
        ownerEmail: remoteRecord.ownerEmail,
        status: remoteRecord.status,
        features: remoteRecord.features,
        maxClients: remoteRecord.maxClients,
        monthlyMsgCap: remoteRecord.monthlyMsgCap,
        validUntil: expiryDate,
        machineFingerprint: currentFingerprint,
        signature: remoteRecord.signature,
        lastVerifiedAt: new Date(),
      },
      create: {
        id: "singleton",
        licenseKey: remoteRecord.licenseKey,
        licenseType: remoteRecord.licenseType,
        ownerEmail: remoteRecord.ownerEmail,
        status: remoteRecord.status,
        features: remoteRecord.features,
        maxClients: remoteRecord.maxClients,
        monthlyMsgCap: remoteRecord.monthlyMsgCap,
        validUntil: expiryDate,
        machineFingerprint: currentFingerprint,
        signature: remoteRecord.signature,
        lastVerifiedAt: new Date(),
      },
    });

    return {
      isValid: true,
      tier: remoteRecord.licenseType,
      message: "License verified successfully via Google Sheets.",
      maxClients: remoteRecord.maxClients,
      monthlyMsgCap: remoteRecord.monthlyMsgCap,
      features: remoteRecord.features.split(",").map((f) => f.trim()),
      ownerEmail: remoteRecord.ownerEmail,
    };
  }

  // 3. Fallback: 24-Hour Offline Grace Cache if Google Sheets was unreachable
  if (cached) {
    const hoursSinceVerification = (Date.now() - cached.lastVerifiedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceVerification <= 24 && cached.status === "ACTIVE" && new Date() < cached.validUntil) {
      if (cached.machineFingerprint === currentFingerprint) {
        return {
          isValid: true,
          tier: cached.licenseType as "SUPER_ADMIN" | "ADMIN",
          message: "Verified via local offline grace cache (24h valid).",
          maxClients: cached.maxClients,
          monthlyMsgCap: cached.monthlyMsgCap,
          features: cached.features.split(",").map((f) => f.trim()),
          ownerEmail: cached.ownerEmail,
        };
      }
    }
  }

  return {
    isValid: false,
    tier: "UNLICENSED",
    message: "Invalid license key or unauthorized machine.",
    maxClients: 0,
    monthlyMsgCap: 0,
    features: [],
  };
}

/**
 * Aggregates local usage metrics and pushes them to the Super Admin's Google Sheet Usage_Telemetry tab.
 */
export async function syncTelemetryBatch(): Promise<boolean> {
  const cachedLicense = await prisma.licenseCache.findUnique({
    where: { id: "singleton" },
  });

  if (!cachedLicense || cachedLicense.status !== "ACTIVE") {
    return false;
  }

  // Count active client workspaces
  const activeClients = await prisma.clientWorkspace.count();
  const connectedNumbers = await prisma.clientWorkspace.count({
    where: { whatsappStatus: "CONNECTED" },
  });

  // Count total contacts served
  const totalContacts = await prisma.contact.count();

  // Aggregate monthly messages and tokens
  const aggregateStats = await prisma.chatMessage.aggregate({
    _count: { id: true },
    _sum: { geminiTokens: true },
  });

  const totalMessages = aggregateStats._count.id;
  const totalTokens = aggregateStats._sum.geminiTokens || 0;

  // Simple estimated billable calculation: $15 base + $5/client + $0.002/message
  const estimatedCharge = (15 + activeClients * 5 + totalMessages * 0.002).toFixed(2);

  const report: TelemetryReport = {
    licenseKey: cachedLicense.licenseKey,
    adminEmail: cachedLicense.ownerEmail,
    activeClientsCount: activeClients,
    connectedNumbers: connectedNumbers,
    totalUniqueUsersServed: totalContacts,
    messagesSentMonth: totalMessages,
    geminiTokensUsed: totalTokens,
    lastActivePing: new Date().toISOString().replace("T", " ").substring(0, 19),
    billableEstimate: `$${estimatedCharge}`,
  };

  return await pushUsageTelemetryToSheet(report);
}
