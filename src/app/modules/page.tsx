"use client";

import React, { useState } from "react";
import {
  Layers,
  Building,
  ShoppingBag,
  Stethoscope,
  LifeBuoy,
  Radio,
  FileText,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Zap,
  Sliders,
  Play,
  ArrowRight,
} from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NICHE_MODULES_REGISTRY } from "@/lib/modulesRegistry";

export default function ModulesPage() {
  const [enabledModules, setEnabledModules] = useState<string[]>([
    "MOD_REALESTATE",
    "MOD_BROADCAST",
    "MOD_DOCS",
  ]);
  const [selectedIndustry, setSelectedIndustry] = useState("Real Estate");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Condition Rule Test Sandbox State
  const [testPhrase, setTestPhrase] = useState("What are the prices for 3bhk?");
  const [triggeredRule, setTriggeredRule] = useState<string | null>(null);

  const toggleModule = async (moduleId: string) => {
    const isCurrentlyEnabled = enabledModules.includes(moduleId);
    const updated = isCurrentlyEnabled
      ? enabledModules.filter((m) => m !== moduleId)
      : [...enabledModules, moduleId];

    setEnabledModules(updated);

    try {
      await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_module",
          moduleId,
          enable: !isCurrentlyEnabled,
        }),
      });
      setToastMsg(`Module ${!isCurrentlyEnabled ? "Activated" : "Deactivated"} successfully.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyPreset = async (industry: string) => {
    setSelectedIndustry(industry);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_niche_preset",
          industry,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEnabledModules(data.enabledModules);
        setToastMsg(`Applied 1-Click Preset for ${industry}! Recommended modules activated.`);
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const testConditionRule = () => {
    const phrase = testPhrase.toLowerCase();
    if (phrase.includes("price") || phrase.includes("cost") || phrase.includes("3bhk") || phrase.includes("villa")) {
      setTriggeredRule("🎯 Triggered: 'Property Price Inquiry' Rule -> Action: Dispatch Pricing PDF + Prompt Site Visit");
    } else if (phrase.includes("site visit") || phrase.includes("visit")) {
      setTriggeredRule("🎯 Triggered: 'Site Visit Booking' Rule -> Action: Display WhatsApp Calendar Picker");
    } else if (phrase.includes("appointment") || phrase.includes("doctor")) {
      setTriggeredRule("🎯 Triggered: 'Doctor Consultation Booking' Rule -> Action: Display Specialist List");
    } else if (phrase.includes("emergency") || phrase.includes("pain")) {
      setTriggeredRule("🚨 Triggered: 'Emergency Triage Safety Guard' -> Action: Direct to 112 / ER immediately");
    } else if (phrase.includes("stop") || phrase.includes("unsubscribe")) {
      setTriggeredRule("🛑 Triggered: 'Automated Opt-Out (STOP)' -> Action: Blacklist contact & Tag UNSUBSCRIBED");
    } else {
      setTriggeredRule("🤖 No hard deterministic rule match -> Handed over to Google Gemini 2.0 Reasoning Core");
    }
  };

  const getModuleIcon = (id: string) => {
    switch (id) {
      case "MOD_REALESTATE":
        return <Building className="w-5 h-5 text-cyan-400" />;
      case "MOD_ECOMMERCE":
        return <ShoppingBag className="w-5 h-5 text-violet-400" />;
      case "MOD_HEALTHCARE":
        return <Stethoscope className="w-5 h-5 text-emerald-400" />;
      case "MOD_SUPPORT":
        return <LifeBuoy className="w-5 h-5 text-amber-400" />;
      case "MOD_BROADCAST":
        return <Radio className="w-5 h-5 text-blue-400" />;
      default:
        return <FileText className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="glass-panel p-8 rounded-2xl border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-mono font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              ADD-ON MODULE HUB
            </span>
            <StatusBadge status="ACTIVE" label="LAZY LOADING ACTIVE" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Niche Modules & Condition Rule Cards
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Toggle high-value niche capabilities per client with zero memory bloat. Inactive modules consume zero RAM.
          </p>
        </div>

        {/* 1-Click Industry Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">1-Click Niche:</span>
          {["Real Estate", "Healthcare", "Retail & Commerce", "Support"].map((ind) => (
            <button
              key={ind}
              onClick={() => handleApplyPreset(ind)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                selectedIndustry === ind
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-black/30 text-slate-400 hover:text-white border-white/5"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-in zoom-in-95">
          <CheckCircle className="w-4 h-4 text-cyan-400" />
          {toastMsg}
        </div>
      )}

      {/* The 6 Niche Modules Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {NICHE_MODULES_REGISTRY.map((mod) => {
          const isEnabled = enabledModules.includes(mod.id);
          return (
            <div
              key={mod.id}
              className={`glass-panel p-6 rounded-2xl border transition-all space-y-4 ${
                isEnabled
                  ? "border-cyan-500/30 shadow-[0_0_20px_-5px_rgba(0,242,254,0.15)]"
                  : "border-white/5 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    {getModuleIcon(mod.id)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{mod.name}</h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{mod.industry}</span>
                  </div>
                </div>

                <button
                  onClick={() => toggleModule(mod.id)}
                  className="cursor-pointer transition-transform active:scale-90"
                >
                  {isEnabled ? (
                    <ToggleRight className="w-8 h-8 text-cyan-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed min-h-[48px]">{mod.description}</p>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Condition Rules:</span>
                {mod.defaultRules.map((r) => (
                  <div key={r.id} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Condition Rule Testing Sandbox */}
      <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            "If-This-Then-That" Condition Rule Tester
          </h2>
          <span className="text-[11px] font-mono text-slate-400">ZERO CODING RULE ENGINE</span>
        </div>

        <p className="text-xs text-slate-400">
          Type an incoming customer phrase to test which condition rule triggers before it reaches the AI agent.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testPhrase}
            onChange={(e) => setTestPhrase(e.target.value)}
            placeholder="Type customer message (e.g., Book doctor appointment, Price of villa, STOP)..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-500/50 outline-none font-mono"
          />
          <CyberButton
            variant="primary"
            onClick={testConditionRule}
            icon={<Play className="w-3.5 h-3.5 text-slate-950" />}
          >
            Evaluate Rule
          </CyberButton>
        </div>

        {triggeredRule && (
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs font-mono text-cyan-300 animate-in zoom-in-95">
            {triggeredRule}
          </div>
        )}
      </div>
    </div>
  );
}
