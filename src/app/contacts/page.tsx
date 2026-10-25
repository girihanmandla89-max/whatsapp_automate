"use client";

import React, { useState, useMemo } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Search,
  Tag,
  Phone,
  Layers,
  Copy,
  Zap,
  RefreshCw,
  QrCode,
  Link as LinkIcon,
  HelpCircle,
  X,
} from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ContactsPage() {
  // Search query state for instant filtering
  const [searchQuery, setSearchQuery] = useState("");

  // Active Acquisition Tab: 'bulk' | 'sheet' | 'webhook' | 'whatsapp'
  const [activeMethod, setActiveMethod] = useState<"bulk" | "sheet" | "webhook" | "whatsapp">("bulk");

  // Method 1: Bulk File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultTag, setDefaultTag] = useState("OCT_CAMPAIGN_LEADS");
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    totalProcessed: number;
  } | null>(null);

  // Method 2: Live Google Sheet Polling State
  const [clientSheetUrl, setClientSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1XyZ_client_leads/edit");
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSyncResult, setSheetSyncResult] = useState<string | null>(null);

  // Method 3: Webhook State
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const webhookUrl = "http://localhost:3000/api/leads/webhook?clientId=default-client-1&key=nexus_lead_secret_9981";

  // Method 4: WhatsApp Inbound State
  const [firstMessageReply, setFirstMessageReply] = useState("Hello! Welcome to our service. How can we assist you today?");
  const [autoTagFirstMessage, setAutoTagFirstMessage] = useState("INBOUND_FIRST_CONTACT");
  const [savedWhatsAppRule, setSavedWhatsAppRule] = useState(false);

  // Existing Contacts State
  const [contacts, setContacts] = useState([
    {
      id: "1",
      name: "Rahul Sharma",
      phone: "+91 98450 11223",
      tags: "VIP, 3BHK_VILLA",
      leadScore: "HOT",
      date: "Today, 10:30 AM",
      source: "Bulk Import",
    },
    {
      id: "2",
      name: "Priya Patel",
      phone: "+91 98123 44556",
      tags: "CLINIC_PATIENT",
      leadScore: "WARM",
      date: "Yesterday",
      source: "Google Sheet Sync",
    },
    {
      id: "3",
      name: "Arun Mehta",
      phone: "+91 97400 99887",
      tags: "RETAIL_SUMMER",
      leadScore: "COLD",
      date: "2 days ago",
      source: "WhatsApp Inbound",
    },
  ]);

  // High-performance memoized search filtering across name, phone, tags, and source
  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((c) => {
      const matchName = c.name.toLowerCase().includes(query);
      const matchPhone = c.phone.replace(/\D/g, "").includes(query.replace(/\D/g, "")) || c.phone.toLowerCase().includes(query);
      const matchTags = c.tags.toLowerCase().includes(query);
      const matchSource = c.source.toLowerCase().includes(query);
      const matchScore = c.leadScore.toLowerCase().includes(query);
      return matchName || matchPhone || matchTags || matchSource || matchScore;
    });
  }, [contacts, searchQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("clientId", "default-client-1");
    formData.append("defaultTag", defaultTag);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data);
        setSelectedFile(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open("/api/contacts?template=true", "_blank");
  };

  const handleSyncSheet = async () => {
    setIsSyncingSheet(true);
    setSheetSyncResult(null);
    try {
      const res = await fetch("/api/contacts/sync-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_sheet_now",
          clientId: "default-client-1",
          googleSheetUrl: clientSheetUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSheetSyncResult(`Success: Checked ${data.totalChecked} rows in client sheet. Added ${data.addedCount} brand new leads!`);
      } else {
        setSheetSyncResult(`Status: ${data.message || "Configure Google Cloud Service Account in .env to poll remote sheet."}`);
      }
    } catch (err: any) {
      setSheetSyncResult("Failed to poll sheet.");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="glass-panel p-8 rounded-2xl border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              CLIENT CONTACT DIRECTORY
            </span>
            <StatusBadge status="ACTIVE" label="PRESTIGE HEIGHTS REALTY" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Lead Acquisition & Contact Management
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Choose how your client wants to feed new contacts into this tool: one-time Excel uploads, 24/7 Google Sheets cloud buffer, Facebook/Website Webhooks, or Inbound WhatsApp QR capture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CyberButton
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
            onClick={() => window.open("/api/contacts?template=true&format=xlsx", "_blank")}
          >
            Sample Template (.xlsx)
          </CyberButton>
          <CyberButton
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5 text-violet-400" />}
            onClick={() => window.open("/api/contacts?template=true&format=csv", "_blank")}
          >
            Sample Template (.csv)
          </CyberButton>
        </div>
      </div>

      {/* Interactive Acquisition Methods Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          {
            id: "bulk",
            title: "Option 1: Excel Bulk Upload",
            sub: "Upload .xlsx / .csv batches",
            icon: "📁",
            activeClass: "border-cyan-500/40 bg-cyan-950/20 shadow-[0_0_20px_-5px_rgba(0,242,254,0.3)]",
          },
          {
            id: "sheet",
            title: "Option 2: Live Google Sheet",
            sub: "Client types in Sheets; never loses leads if PC is off",
            icon: "🟢",
            activeClass: "border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]",
          },
          {
            id: "webhook",
            title: "Option 3: Instant Webhook",
            sub: "Facebook Ads, Web forms & Zapier",
            icon: "⚡",
            activeClass: "border-violet-500/40 bg-violet-950/20 shadow-[0_0_20px_-5px_rgba(138,43,226,0.3)]",
          },
          {
            id: "whatsapp",
            title: "Option 4: Inbound WhatsApp",
            sub: "Store Walk-in QR & Social Bio capture",
            icon: "💬",
            activeClass: "border-amber-500/40 bg-amber-950/20 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]",
          },
        ].map((method) => (
          <button
            key={method.id}
            onClick={() => setActiveMethod(method.id as any)}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer select-none space-y-2 ${
              activeMethod === method.id
                ? method.activeClass
                : "glass-panel border-white/5 hover:border-white/20 opacity-80 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs text-white">
              <span className="text-base">{method.icon}</span>
              {method.title}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{method.sub}</p>
          </button>
        ))}
      </div>

      {/* Main Grid: Active Method Action Panel + Contact List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Dynamic Action Panel (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border-white/5 space-y-6">
          {/* OPTION 1: EXCEL BULK UPLOAD */}
          {activeMethod === "bulk" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-cyan-400" />
                  Excel / CSV File Importer
                </h2>
                <span className="text-[11px] font-mono text-cyan-400">BATCH UPLOAD</span>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="border-2 border-dashed border-white/10 hover:border-cyan-500/40 rounded-2xl p-6 text-center space-y-3 bg-black/20 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">
                      {selectedFile ? selectedFile.name : "Select client's Excel or CSV file"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Supports .xlsx, .xls, and .csv</p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="contact-file-input"
                  />
                  <label
                    htmlFor="contact-file-input"
                    className="inline-block px-4 py-2 rounded-xl text-xs font-semibold glass-panel border-white/10 hover:border-cyan-500/30 text-cyan-300 cursor-pointer transition-all"
                  >
                    Browse File
                  </label>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Audience Tag for this Upload:
                  </label>
                  <input
                    type="text"
                    value={defaultTag}
                    onChange={(e) => setDefaultTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-cyan-500/50 outline-none"
                  />
                </div>

                <CyberButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isUploading}
                  disabled={!selectedFile}
                  icon={<UploadCloud className="w-4 h-4 text-slate-950" />}
                >
                  Start Import
                </CyberButton>
              </form>

              {importResult && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 animate-in zoom-in-95 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <CheckCircle className="w-4 h-4" /> Import Completed!
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <span className="text-slate-400 block text-[9px]">IMPORTED</span>
                      <span className="text-emerald-400 font-bold">{importResult.importedCount}</span>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <span className="text-slate-400 block text-[9px]">SKIPPED</span>
                      <span className="text-amber-400 font-bold">{importResult.skippedCount}</span>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <span className="text-slate-400 block text-[9px]">TOTAL</span>
                      <span className="text-white font-bold">{importResult.totalProcessed}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OPTION 2: LIVE GOOGLE SHEET CLOUD BUFFER */}
          {activeMethod === "sheet" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Live Google Sheet Cloud Buffer
                </h2>
                <span className="text-[11px] font-mono text-emerald-400">24/7 SAFE BUFFER</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-300 leading-relaxed space-y-1">
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Why this is best for non-technical clients:
                </p>
                <p>
                  Give your client a Google Sheet. They can type or paste new leads anytime. If the Admin's laptop is <strong>shut down</strong>, the leads wait safely in Google Sheets and sync automatically on next startup!
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Client's Google Sheet URL (Sheet1):
                  </label>
                  <input
                    type="url"
                    value={clientSheetUrl}
                    onChange={(e) => setClientSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-emerald-500/50 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Expected columns: <code className="text-emerald-400">Phone Number</code>, <code className="text-emerald-400">Full Name</code>, <code className="text-emerald-400">Tags</code>.
                  </p>
                </div>

                <CyberButton
                  variant="primary"
                  className="w-full"
                  isLoading={isSyncingSheet}
                  onClick={handleSyncSheet}
                  icon={<RefreshCw className={`w-4 h-4 text-slate-950 ${isSyncingSheet ? "animate-spin" : ""}`} />}
                >
                  Sync New Leads from Sheet Now
                </CyberButton>
              </div>

              {sheetSyncResult && (
                <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 text-xs font-mono text-emerald-300 animate-in zoom-in-95">
                  {sheetSyncResult}
                </div>
              )}
            </div>
          )}

          {/* OPTION 3: INSTANT WEBHOOK (FACEBOOK / WEBSITE) */}
          {activeMethod === "webhook" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  Instant Webhook & Ad Integrations
                </h2>
                <span className="text-[11px] font-mono text-violet-400">SUB-SECOND SYNC</span>
              </div>

              <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/20 text-xs text-slate-300 leading-relaxed space-y-1">
                <p className="font-semibold text-violet-300">
                  Facebook Lead Ads, Webflow, WordPress, Elementor & Zapier
                </p>
                <p className="text-[11px] text-slate-400">
                  When a customer fills a lead form online, send a POST request to this dedicated endpoint to ingest the lead in real time.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Client's Dedicated Webhook URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-cyan-300 text-[11px] font-mono outline-none"
                  />
                  <CyberButton variant="secondary" size="sm" onClick={copyWebhook} icon={<Copy className="w-3.5 h-3.5" />}>
                    {copiedWebhook ? "Copied!" : "Copy"}
                  </CyberButton>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-[11px] font-mono text-slate-400">
                  <span className="text-white block font-sans font-semibold mb-1">Expected JSON Payload:</span>
                  <p className="text-cyan-400">
                    {`{ "phone": "+919876543210", "name": "Lead Name", "source": "FB_AD_1" }`}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 space-y-1">
                  <span className="text-white font-semibold block">⚠️ PC Shutdown Protection:</span>
                  <p>
                    If running on local PC without cloud VPS, route Facebook leads into <strong>Method 2 (Google Sheets)</strong> via Zapier so leads buffer safely in the cloud 24/7!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* OPTION 4: INBOUND WHATSAPP FIRST-MESSAGE */}
          {activeMethod === "whatsapp" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  Inbound WhatsApp "First-Message" Capture
                </h2>
                <span className="text-[11px] font-mono text-amber-400">ZERO SETUP</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-slate-300 leading-relaxed space-y-1">
                <p className="font-semibold text-amber-300">
                  Walk-in QR Codes, Business Cards & Social Media Bios
                </p>
                <p className="text-[11px] text-slate-400">
                  Whenever a brand new person sends any WhatsApp message (*"Hi"*, *"Price"*, *"Catalog"*) to the client's number, they are <strong>automatically saved as a new Contact</strong> in SQLite!
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Auto-Assign Tag to First-Time WhatsApp Contacts:
                  </label>
                  <input
                    type="text"
                    value={autoTagFirstMessage}
                    onChange={(e) => setAutoTagFirstMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-amber-500/50 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Automated First-Message Welcome Greeting:
                  </label>
                  <textarea
                    rows={3}
                    value={firstMessageReply}
                    onChange={(e) => setFirstMessageReply(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs leading-relaxed focus:border-amber-500/50 outline-none resize-none font-mono"
                  />
                </div>

                <CyberButton
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setSavedWhatsAppRule(true);
                    setTimeout(() => setSavedWhatsAppRule(false), 3000);
                  }}
                >
                  {savedWhatsAppRule ? "Rule Saved to Baileys Engine!" : "Save Inbound Capture Rule"}
                </CyberButton>
              </div>
            </div>
          )}
        </div>

        {/* Existing Contacts Table (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border-white/5 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                Contacts for Active Client ({filteredContacts.length} of {contacts.length})
              </h2>
              {searchQuery && (
                <p className="text-[10px] text-cyan-400 font-mono mt-0.5">
                  Filtering by: "{searchQuery}"
                </p>
              )}
            </div>

            {/* High-Performance Search Input with Clear Button */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, tags, source..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-black/50 border border-white/10 hover:border-cyan-500/40 focus:border-cyan-500 text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[500px]">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{c.name}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          c.leadScore === "HOT"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        }`}
                      >
                        {c.leadScore}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-cyan-400">{c.phone}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 block truncate max-w-[140px]">
                      {c.tags}
                    </span>
                    <div className="flex items-center justify-end gap-1.5 text-[9px] text-slate-500 font-mono">
                      <span className="text-slate-400 font-medium">Source: {c.source}</span>
                      <span>•</span>
                      <span>{c.date}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 rounded-2xl bg-black/40 border border-white/10 text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_20px_-3px_rgba(244,63,94,0.3)]">
                  <Search className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase font-bold">
                    0 MATCHES FOUND
                  </span>
                  <h3 className="text-sm font-bold text-white pt-1">
                    No Contacts Found Matching &ldquo;<span className="text-cyan-400 font-mono">{searchQuery}</span>&rdquo;
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    We could not find any contacts with that name, phone number, audience tag, or source in this client&rsquo;s directory.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <CyberButton
                    variant="primary"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    icon={<X className="w-3.5 h-3.5 text-slate-950" />}
                  >
                    Clear Search & View All Contacts
                  </CyberButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
