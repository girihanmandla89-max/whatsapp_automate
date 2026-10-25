import crypto from "crypto";
import { machineIdSync } from "node-machine-id";

// Super Admin master cryptographic salt (can be configured via environment variable)
const MASTER_SECRET = process.env.LICENSE_MASTER_SECRET || "SUPER_NEXUS_AI_MASTER_KEY_2026_SECURE_9812";

export interface LicensePayload {
  licenseKey: string;
  licenseType: "SUPER_ADMIN" | "ADMIN";
  ownerEmail: string;
  maxClients: number;
  monthlyMsgCap: number;
  validUntil: string; // ISO date string YYYY-MM-DD
  features: string;
}

/**
 * Generates an immutable HMAC-SHA256 signature for a license entry.
 * If any parameter is manually changed in Google Sheets without this secret, the signature becomes invalid.
 */
export function generateLicenseSignature(payload: LicensePayload): string {
  const serialized = `${payload.licenseKey.trim()}|${payload.licenseType.trim()}|${payload.ownerEmail.trim().toLowerCase()}|${payload.maxClients}|${payload.monthlyMsgCap}|${payload.validUntil.trim()}|${payload.features.trim()}`;
  return crypto.createHmac("sha256", MASTER_SECRET).update(serialized).digest("hex");
}

/**
 * Validates whether the given signature matches the payload.
 */
export function verifyLicenseSignature(payload: LicensePayload, providedSignature: string): boolean {
  if (!providedSignature) return false;
  const expected = generateLicenseSignature(payload);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedSignature.trim()));
}

/**
 * Returns a persistent, unique machine hardware fingerprint hash for the current host.
 * Binds the license to prevent unauthorized cloning.
 */
export function getMachineFingerprint(): string {
  try {
    const rawId = machineIdSync(true);
    return crypto.createHash("sha256").update(`NEXUS_HARDWARE_${rawId}`).digest("hex");
  } catch (err) {
    // Fallback based on host info if machine ID query is restricted
    const fallback = crypto.createHash("sha256").update(`NEXUS_FALLBACK_${process.platform}_${process.arch}`).digest("hex");
    return fallback;
  }
}
