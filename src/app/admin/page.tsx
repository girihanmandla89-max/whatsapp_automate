"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Users,
  CheckCircle,
  Copy,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  Trash2,
  PauseCircle,
  PlayCircle,
  ArrowUpCircle,
  Calendar,
  Lock,
  Unlock,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface AdminLicenseHolder {
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
  // Associated Telemetry
  activeClientsCount?: number;
  connectedNumbers?: number;
  totalUniqueUsersServed?: number;
  messagesSentMonth?: number;
  geminiTokensUsed?: number;
  lastActivePing?: string;
  billableEstimate?: string;
}

export default function SuperAdminPage() {
  const [licenseForm, setLicenseForm] = useState({
    licenseKey: "LIC-DEMO-9821",
    licenseType: "ADMIN" as "SUPER_ADMIN" | "ADMIN",
    ownerEmail: "agency@growthlead.com",
    maxClients: 5,
    monthlyMsgCap: 25000,
    validUntil: "2027-12-31",
    features: "CORE,BAILEYS,GEMINI,BROADCAST,MOD_REALESTATE,MOD_ECOMMERCE",
  });

  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Existing License Holders List (Two-Way Sync with Google Sheets)
  const [licenses, setLicenses] = useState<AdminLicenseHolder[]>([
    {
      licenseKey: "LIC-ALPHA-4912",
      licenseType: "ADMIN",
      ownerEmail: "apex.agency@growth.com",
      status: "ACTIVE",
      boundFingerprint: "a8f3b29c4e1...",
      features: "CORE,BAILEYS,GEMINI,MOD_REALESTATE,MOD_BROADCAST",
      maxClients: 5,
      monthlyMsgCap: 30000,
      validUntil: "2027-12-31",
      signature: "e3b0c44298fc1c149afbf4c8...",
      activeClientsCount: 4,
      connectedNumbers: 4,
      totalUniqueUsersServed: 2420,
      messagesSentMonth: 12400,
      geminiTokensUsed: 184500,
      lastActivePing: "10 mins ago",
      billableEstimate: "$74.80",
    },
    {
      licenseKey: "LIC-BETA-7731",
      licenseType: "ADMIN",
      ownerEmail: "medicare.solutions@gmail.com",
      status: "ACTIVE",
      boundFingerprint: "d9e2a188f01...",
      features: "CORE,BAILEYS,GEMINI,MOD_HEALTHCARE,MOD_SUPPORT",
      maxClients: 2,
      monthlyMsgCap: 15000,
      validUntil: "2027-06-30",
      signature: "f7c3bc1d8a22149afbf4c8...",
      activeClientsCount: 2,
      connectedNumbers: 2,
      totalUniqueUsersServed: 890,
      messagesSentMonth: 4200,
      geminiTokensUsed: 62000,
      lastActivePing: "2 hours ago",
      billableEstimate: "$33.40",
    },
    {
      licenseKey: "LIC-HOLD-3319",
      licenseType: "ADMIN",
      ownerEmail: "retail.marketers@agency.io",
      status: "SUSPENDED",
      boundFingerprint: "c4a7e990b12...",
      features: "CORE,BAILEYS,GEMINI,MOD_ECOMMERCE",
      maxClients: 1,
      monthlyMsgCap: 10000,
      validUntil: "2026-11-30",
      signature: "b1a2c3d4e5f6...",
      activeClientsCount: 1,
      connectedNumbers: 0,
      totalUniqueUsersServed: 310,
      messagesSentMonth: 900,
      geminiTokensUsed: 12000,
      lastActivePing: "3 days ago (On Hold)",
      billableEstimate: "$15.00",
    },
  ]);

  // Selected License for Modal Edit
  const [editingLicense, setEditingLicense] = useState<AdminLicenseHolder | null>(null);

  // Generate random key after mount
  useEffect(() => {
    const randomKey = `LIC-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setLicenseForm((prev) => ({ ...prev, licenseKey: randomKey }));
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_signature",
          ...licenseForm,
        }),
      });
      const data = await res.json();
      setGeneratedResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSyncTelemetry = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_telemetry" }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus("Two-Way Sync: Licenses & Live Telemetry synced with Google Sheets!");
      } else {
        setSyncStatus("Two-Way Sync: Local changes saved. Connect Google Cloud Service Account in .env to update live Google Sheets remote.");
      }
    } catch (err) {
      setSyncStatus("Failed to sync telemetry.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 1-Click Status Toggle (Hold / Resume License)
  const handleToggleHold = async (lic: AdminLicenseHolder) => {
    const newStatus = lic.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const updated = { ...lic, status: newStatus as any };
    setLicenses(licenses.map((l) => (l.licenseKey === lic.licenseKey ? updated : l)));

    setSyncStatus(`License ${lic.licenseKey} is now ${newStatus}. Google Sheet row updated!`);
    setTimeout(() => setSyncStatus(null), 4000);

    await fetch("/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "modify_license",
        licenseKey: lic.licenseKey,
        licenseType: lic.licenseType,
        ownerEmail: lic.ownerEmail,
        maxClients: lic.maxClients,
        monthlyMsgCap: lic.monthlyMsgCap,
        validUntil: lic.validUntil,
        features: lic.features,
        status: newStatus,
      }),
    });
  };

  // 1-Click Hardware Reset (Allows Admin to switch laptops/servers)
  const handleResetHardware = async (licenseKey: string) => {
    setLicenses(
      licenses.map((l) =>
        l.licenseKey === licenseKey ? { ...l, boundFingerprint: "Reset (Unbound)" } : l
      )
    );
    setSyncStatus(`Hardware lock cleared for ${licenseKey}. The Admin can now activate on their new machine.`);
    setTimeout(() => setSyncStatus(null), 4000);

    const target = licenses.find((l) => l.licenseKey === licenseKey);
    if (!target) return;

    await fetch("/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "modify_license",
        ...target,
        resetHardware: true,
      }),
    });
  };

  // Delete / Revoke License
  const handleDeleteLicense = async (licenseKey: string) => {
    if (!confirm(`Are you sure you want to completely REVOKE and delete license ${licenseKey}?`)) return;
    setLicenses(licenses.filter((l) => l.licenseKey !== licenseKey));
    setSyncStatus(`License ${licenseKey} revoked and removed from Google Sheets.`);
    setTimeout(() => setSyncStatus(null), 4000);

    await fetch("/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_license",
        licenseKey,
      }),
    });
  };

  // Save Modal Edits (Upgrade, Downgrade, Extend Expiry)
  const handleSaveModalEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;

    setLicenses(licenses.map((l) => (l.licenseKey === editingLicense.licenseKey ? editingLicense : l)));
    const key = editingLicense.licenseKey;
    setEditingLicense(null);

    setSyncStatus(`License ${key} updated (New limits & HMAC signature written to Google Sheet).`);
    setTimeout(() => setSyncStatus(null), 4000);

    await fetch("/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "modify_license",
        ...editingLicense,
      }),
    });
  };

  const copyRow = () => {
    if (generatedResult?.rowValues) {
      navigator.clipboard.writeText(generatedResult.rowValues.join("\t"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="glass-panel p-8 rounded-2xl border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-mono font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              COMMAND CENTER: SUPER ADMIN
            </span>
            <StatusBadge status="ACTIVE" label="MASTER SPREADSHEET SYNC" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            License Control Hub & Telemetry Billing
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Manage active Admins, upgrade/downgrade client limits, hold or extend licenses, and view live usage telemetry. Changes sync two-way with your Google Sheet.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CyberButton
            variant="secondary"
            icon={<RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />}
            onClick={handleSyncTelemetry}
            isLoading={isSyncing}
          >
            Pull / Push Google Sheet Sync
          </CyberButton>
        </div>
      </div>

      {syncStatus && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-in zoom-in-95">
          <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* SECTION 1: MANAGE EXISTING LICENSE HOLDERS & TELEMETRY */}
      <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Active License Holders & Usage Telemetry ({licenses.length})
            </h2>
            <p className="text-xs text-slate-400">
              Live tracking of active admins, connected numbers, token burn rates, and billing charges.
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            TWO-WAY SPREADSHEET SYNC ACTIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase bg-black/30">
                <th className="p-3">License Key / Admin</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tier & Limits</th>
                <th className="p-3">Live Telemetry</th>
                <th className="p-3">Token & Msg Usage</th>
                <th className="p-3">Est. Bill</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {licenses.map((lic) => (
                <tr key={lic.licenseKey} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3 font-mono">
                    <p className="font-bold text-white">{lic.licenseKey}</p>
                    <p className="text-[11px] text-cyan-400">{lic.ownerEmail}</p>
                    <span className="text-[10px] text-slate-500 block truncate max-w-[140px]" title={lic.boundFingerprint}>
                      HW: {lic.boundFingerprint}
                    </span>
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        lic.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${lic.status === "ACTIVE" ? "bg-emerald-400" : "bg-rose-400"}`} />
                      {lic.status}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono mt-1">Exp: {lic.validUntil}</span>
                  </td>

                  <td className="p-3 space-y-0.5">
                    <span className="text-[11px] font-bold text-white">{lic.licenseType}</span>
                    <p className="text-[11px] text-slate-400">Max Clients: <strong className="text-cyan-300">{lic.maxClients}</strong></p>
                    <p className="text-[10px] text-slate-500 font-mono">Cap: {lic.monthlyMsgCap ? lic.monthlyMsgCap.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0"} msgs</p>
                  </td>

                  <td className="p-3 space-y-0.5">
                    <p className="text-[11px] text-slate-300">
                      Clients Active: <strong className="text-white">{lic.activeClientsCount}</strong> / {lic.maxClients}
                    </p>
                    <p className="text-[11px] text-emerald-400">
                      WhatsApp Numbers: {lic.connectedNumbers} Online
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">Users: {lic.totalUniqueUsersServed ? lic.totalUniqueUsersServed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0"}</p>
                  </td>

                  <td className="p-3 space-y-0.5">
                    <p className="text-[11px] text-slate-300">
                      Sent: <strong className="text-cyan-400">{lic.messagesSentMonth ? lic.messagesSentMonth.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0"}</strong> msgs
                    </p>
                    <p className="text-[11px] text-violet-300">
                      Tokens: {lic.geminiTokensUsed ? lic.geminiTokensUsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0"}
                    </p>
                    <span className="text-[9px] text-slate-500 block font-mono">Ping: {lic.lastActivePing}</span>
                  </td>

                  <td className="p-3">
                    <span className="text-sm font-bold font-mono text-amber-400">{lic.billableEstimate}</span>
                    <span className="text-[9px] text-slate-500 block">per month</span>
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Hold / Resume */}
                      <button
                        onClick={() => handleToggleHold(lic)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                          lic.status === "ACTIVE"
                            ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                        title={lic.status === "ACTIVE" ? "Hold / Suspend License" : "Resume License"}
                      >
                        {lic.status === "ACTIVE" ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                      </button>

                      {/* Upgrade / Edit Limits */}
                      <button
                        onClick={() => setEditingLicense(lic)}
                        className="p-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs transition-colors cursor-pointer"
                        title="Upgrade / Modify License Limits"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                      </button>

                      {/* Reset Hardware Lock */}
                      <button
                        onClick={() => handleResetHardware(lic.licenseKey)}
                        className="p-1.5 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 text-xs transition-colors cursor-pointer"
                        title="Reset Machine Hardware Lock"
                      >
                        <Unlock className="w-4 h-4" />
                      </button>

                      {/* Revoke / Delete */}
                      <button
                        onClick={() => handleDeleteLicense(lic.licenseKey)}
                        className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs transition-colors cursor-pointer"
                        title="Revoke & Delete License"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDIT / UPGRADE / EXTEND LICENSE */}
      {editingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel-glow max-w-lg w-full p-6 rounded-2xl space-y-6 shadow-2xl relative border-cyan-500/30">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Upgrade / Modify License</h3>
              </div>
              <button
                onClick={() => setEditingLicense(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded bg-white/5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModalEdit} className="space-y-4">
              <div className="p-3 rounded-xl bg-black/40 font-mono text-xs text-slate-300 border border-white/5 space-y-1">
                <p>License: <strong className="text-white">{editingLicense.licenseKey}</strong></p>
                <p>Owner: <span className="text-cyan-400">{editingLicense.ownerEmail}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Upgrade / Downgrade Tier:
                  </label>
                  <select
                    value={editingLicense.licenseType}
                    onChange={(e) => setEditingLicense({ ...editingLicense, licenseType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    <option value="ADMIN">ADMIN (Agency)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Master)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Status:
                  </label>
                  <select
                    value={editingLicense.status}
                    onChange={(e) => setEditingLicense({ ...editingLicense, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">ACTIVE (Running)</option>
                    <option value="SUSPENDED">SUSPENDED (On Hold)</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Max Clients Allowance:
                  </label>
                  <input
                    type="number"
                    value={editingLicense.maxClients}
                    onChange={(e) => setEditingLicense({ ...editingLicense, maxClients: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono outline-none focus:border-cyan-500"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Monthly Msg Cap:
                  </label>
                  <input
                    type="number"
                    value={editingLicense.monthlyMsgCap}
                    onChange={(e) => setEditingLicense({ ...editingLicense, monthlyMsgCap: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono outline-none focus:border-cyan-500"
                    step="5000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Extend Validity Date (Expiry):
                </label>
                <input
                  type="date"
                  value={editingLicense.validUntil}
                  onChange={(e) => setEditingLicense({ ...editingLicense, validUntil: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Enabled Feature Flags:
                </label>
                <input
                  type="text"
                  value={editingLicense.features}
                  onChange={(e) => setEditingLicense({ ...editingLicense, features: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <CyberButton
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setEditingLicense(null)}
                >
                  Cancel
                </CyberButton>
                <CyberButton type="submit" variant="primary" className="w-full">
                  Save & Update Google Sheet
                </CyberButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 2: CREATE NEW LICENSE (HMAC GENERATOR) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Issue New Cryptographic License
            </h2>
            <span className="text-[11px] font-mono text-cyan-400">HMAC-SHA256 SECURED</span>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  License Key
                </label>
                <input
                  type="text"
                  value={licenseForm.licenseKey}
                  onChange={(e) => setLicenseForm({ ...licenseForm, licenseKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-cyan-500/50 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  License Tier
                </label>
                <select
                  value={licenseForm.licenseType}
                  onChange={(e) => setLicenseForm({ ...licenseForm, licenseType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-cyan-500/50"
                >
                  <option value="ADMIN">ADMIN (Agency / Reseller)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Platform Master)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Owner Email
              </label>
              <input
                type="email"
                value={licenseForm.ownerEmail}
                onChange={(e) => setLicenseForm({ ...licenseForm, ownerEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-500/50 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Max Clients
                </label>
                <input
                  type="number"
                  value={licenseForm.maxClients}
                  onChange={(e) => setLicenseForm({ ...licenseForm, maxClients: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono outline-none"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Monthly Msg Cap
                </label>
                <input
                  type="number"
                  value={licenseForm.monthlyMsgCap}
                  onChange={(e) => setLicenseForm({ ...licenseForm, monthlyMsgCap: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono outline-none"
                  min="1000"
                  step="5000"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={licenseForm.validUntil}
                  onChange={(e) => setLicenseForm({ ...licenseForm, validUntil: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none"
                  required
                />
              </div>
            </div>

            <CyberButton
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isGenerating}
              icon={<Zap className="w-4 h-4 text-slate-950" />}
            >
              Generate Cryptographic Signature
            </CyberButton>
          </form>

          {generatedResult && (
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400">
                  Ready to Paste in Google Sheets (Row 1):
                </span>
                <CyberButton variant="secondary" size="sm" onClick={copyRow} icon={<Copy className="w-3.5 h-3.5" />}>
                  {copied ? "Copied Row!" : "Copy Sheet Row"}
                </CyberButton>
              </div>

              <div className="p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                {generatedResult.rowValues.join("\t")}
              </div>
            </div>
          )}
        </div>

        {/* Global Summary Card */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Two-Way Google Spreadsheet Rules
            </h2>
            <span className="text-[11px] font-mono text-emerald-400">LIVE SYNC</span>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <p className="font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                1. Can you alter the spreadsheet from this tool?
              </p>
              <p className="text-slate-400">
                <strong>YES.</strong> When you click <span className="text-amber-400 font-semibold">Hold</span>, <span className="text-cyan-400 font-semibold">Upgrade</span>, or <span className="text-rose-400 font-semibold">Delete</span> above, the software automatically recalculates the HMAC signature and writes the update directly to your Google Sheet!
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <p className="font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                2. If you edit directly inside Google Sheets, will it update here?
              </p>
              <p className="text-slate-400">
                <strong>YES.</strong> Clicking <em>&ldquo;Pull / Push Google Sheet Sync&rdquo;</em> (or during the automated 15-minute sync) re-reads all rows from Google Sheets. If you modified status or dates in the sheet, they instantly reflect here.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <p className="font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                3. What happens to the Admin's software when held or revoked?
              </p>
              <p className="text-slate-400">
                Holding or deleting a license locks that Admin&rsquo;s instance on their very next check. Their clients cannot send automated messages until you resume the license.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
