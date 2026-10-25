"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Plus,
  Download,
  Smartphone,
  Sparkles,
  CheckCircle,
  Clock,
  Layers,
  Send,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function CampaignsPage() {
  const [formName, setFormName] = useState("Prestige Heights 3BHK Property Form");
  const [headerText, setHeaderText] = useState("Welcome to Prestige Heights! Find your dream luxury residence.");
  const [buttons, setButtons] = useState(["🏢 2BHK Smart Home", "🏬 3BHK Grand Villa", "📅 Book Site Visit"]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1XyZ_client_leads");

  // Sample leads already captured
  const [leads, setLeads] = useState([
    {
      id: "l-1",
      name: "Rajesh Kumar",
      phone: "+91 98450 12345",
      type: "3BHK Grand Villa",
      budget: "₹1.45 Cr",
      visit: "Sunday 11:00 AM",
      score: "HOT",
      time: "15 mins ago",
    },
    {
      id: "l-2",
      name: "Pooja Sharma",
      phone: "+91 97400 55667",
      type: "2BHK Smart Home",
      budget: "₹85 Lakhs",
      visit: "Next Week",
      score: "WARM",
      time: "45 mins ago",
    },
  ]);

  const [isSimulating, setIsSimulating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSimulateLead = async (choice: string) => {
    setIsSimulating(true);
    try {
      const randomNames = ["Ananya Roy", "Vikram Malhotra", "Sneha Patel", "Arjun Reddy"];
      const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
      const randomPhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;

      const answers = {
        "Selected Choice": choice,
        "Investment Budget": choice.includes("Villa") ? "₹1.50 Cr" : "₹85 Lakhs",
        "Preferred Timing": "This Weekend",
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_submission",
          customerName: randomName,
          phoneNumber: randomPhone,
          answers,
          leadQuality: "HOT",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLeads((prev) => [
          {
            id: `l-${Date.now()}`,
            name: randomName,
            phone: randomPhone,
            type: choice,
            budget: answers["Investment Budget"],
            visit: answers["Preferred Timing"],
            score: "HOT",
            time: "Just now",
          },
          ...prev,
        ]);
        setSuccessToast(`New Lead Captured: ${randomName} (${choice}) auto-appended to Excel!`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDownloadExcel = () => {
    window.open("/api/campaigns?download=true", "_blank");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="glass-panel p-8 rounded-2xl border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CAMPAIGN & EXCEL ENGINE
            </span>
            <StatusBadge status="ACTIVE" label="LEAD SINK ACTIVE" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            WhatsApp Interactive Forms & Excel Lead Sink
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Interactive buttons and list menus collect customer preferences without typing, saving leads automatically into Client Excel (.xlsx) and Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CyberButton
            variant="primary"
            icon={<Download className="w-4 h-4 text-slate-950" />}
            onClick={handleDownloadExcel}
          >
            Download Client Excel (.xlsx)
          </CyberButton>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2 animate-in zoom-in-95">
          <CheckCircle className="w-4 h-4" />
          {successToast}
        </div>
      )}

      {/* Grid: Visual WhatsApp Builder + Live Mobile Simulator + Real-Time Lead Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Config (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border-white/5 space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Interactive Form Builder
            </h2>
            <span className="text-[11px] font-mono text-cyan-400">ZERO TYPING UI</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Campaign / Form Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-500/50 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                WhatsApp Greeting & Header Text
              </label>
              <textarea
                rows={3}
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs leading-relaxed focus:border-cyan-500/50 outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Clickable Action Buttons (Up to 3)
              </label>
              <div className="space-y-2">
                {buttons.map((btn, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={btn}
                    onChange={(e) => {
                      const updated = [...buttons];
                      updated[idx] = e.target.value;
                      setButtons(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-cyan-500/50 outline-none"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Client Google Sheet Lead Sink (Optional Auto-Sync URL)
              </label>
              <input
                type="url"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-cyan-500/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live Smartphone WhatsApp Mockup (3 cols) */}
        <div className="lg:col-span-3 flex flex-col items-center">
          <div className="w-full max-w-[280px] rounded-[36px] bg-[#07090e] border-4 border-slate-800 shadow-2xl p-3 space-y-3 relative">
            {/* Notch */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto" />

            {/* Chat Screen */}
            <div className="h-[380px] rounded-2xl bg-[#0b141a] p-3 flex flex-col justify-between border border-white/5 overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">
                    P
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white leading-tight">Prestige Heights</p>
                    <p className="text-[8px] text-emerald-400">Official Business Account</p>
                  </div>
                </div>

                {/* Message Bubble */}
                <div className="p-2.5 rounded-xl bg-[#202c33] text-white text-[11px] leading-relaxed shadow-sm space-y-2">
                  <p>{headerText}</p>
                  <p className="text-[9px] text-slate-400 text-right">10:18 AM</p>
                </div>

                {/* Interactive Clickable Buttons */}
                <div className="space-y-1.5 pt-1">
                  {buttons.map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSimulateLead(btn)}
                      disabled={isSimulating}
                      className="w-full py-2 px-3 rounded-lg bg-[#1f2c34] hover:bg-[#2a3942] active:scale-95 text-[#00a884] text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-white/5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 text-[#00a884]" />
                      {btn}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[9px] text-slate-500 text-center">
                Click a button to test instant Excel capture
              </p>
            </div>
          </div>
        </div>

        {/* Real-Time Captured Lead Sink Table (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border-white/5 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Live Lead Sink (.xlsx)
            </h2>
            <span className="text-[11px] font-mono text-emerald-400">{leads.length} LEADS</span>
          </div>

          <p className="text-xs text-slate-400">
            Leads captured live via WhatsApp interactive buttons, ready to export.
          </p>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{lead.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {lead.score}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400">{lead.phone}</p>
                <div className="text-[11px] text-slate-300 font-medium">
                  Choice: <span className="text-cyan-300">{lead.type}</span> ({lead.budget})
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Visit: {lead.visit}</span>
                  <span>{lead.time}</span>
                </div>
              </div>
            ))}
          </div>

          <CyberButton
            variant="secondary"
            size="sm"
            className="w-full"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadExcel}
          >
            Export All to .xlsx
          </CyberButton>
        </div>
      </div>
    </div>
  );
}
