"use client";

import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  Save,
  Send,
  MessageSquare,
  Bot,
  ShieldCheck,
  CheckCircle,
  FileText,
  Sliders,
  Play,
} from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function AIBrainPage() {
  const [selectedPreset, setSelectedPreset] = useState("REAL_ESTATE");
  const [systemPrompt, setSystemPrompt] = useState(
    `You are an executive property consultant for a luxury real estate agency. 
Your goal is to understand the client's requirements: their ideal property type (1BHK/2BHK/Villa), investment budget, and timeline.
Highlight amenities (swimming pool, gym, clubhouse, gated security) and invite them for a site visit this weekend.
Strict Rule: If you do not have specific pricing or availability info, reply that our senior advisor will contact them shortly.`
  );

  const [knowledgeContext, setKnowledgeContext] = useState(
    `Project Name: Prestige Heights Luxury Enclave
Property Types & Pricing:
- 2BHK Smart Apartments (1,150 sq.ft): Starting at ₹85 Lakhs
- 3BHK Grand Condominiums (1,750 sq.ft): Starting at ₹1.35 Cr
- 4BHK Presidential Villas with private pool (3,200 sq.ft): ₹2.40 Cr
Location: 10 mins from Tech Park, Outer Ring Road.
Amenities: Clubhouse, 2 Infinity Pools, Squash Court, Rooftop Lounge, 24/7 Power Backup.
RERA Registration: PRM/KA/RERA/1251/310/PR/2026/00912 (100% Approved).
Payment Schemes: 10:90 Builder Subvention Plan available with HDFC and SBI loans.`
  );

  // Simulator State
  const [simMessages, setSimMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "Hello! Welcome to Prestige Heights. Are you exploring 2BHK apartments or our luxury villas today?",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === "REAL_ESTATE") {
      setSystemPrompt(
        `You are an executive property consultant for a luxury real estate agency. Understand budget and invite for site visits.`
      );
    } else if (preset === "HEALTHCARE") {
      setSystemPrompt(
        `You are an empathetic clinic receptionist. Book doctor appointments and explain hours. NEVER diagnose medical conditions.`
      );
      setKnowledgeContext(
        `Clinic: Apollo Wellness Center. Doctors: Dr. Sharma (Cardiology, 10 AM-2 PM), Dr. Lisa (Dermatology, 3 PM-7 PM). Consultation: ₹800.`
      );
    } else if (preset === "RETAIL") {
      setSystemPrompt(
        `You are a friendly shopping assistant for an apparel store. Suggest matching items and share discount coupon SUMMER15.`
      );
      setKnowledgeContext(
        `Store: Luxe Fashion. Return policy: 14 days exchange. Free shipping on orders over ₹1,999.`
      );
    }
  };

  const handleSaveSettings = async () => {
    try {
      await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          systemPrompt,
          knowledgeContext,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || isSimulating) return;

    const userText = inputMsg;
    setInputMsg("");
    setSimMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setIsSimulating(true);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate",
          message: userText,
        }),
      });
      const data = await res.json();
      setSimMessages((prev) => [...prev, { sender: "bot", text: data.replyText }]);
    } catch (err) {
      setSimMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error connecting to AI simulator." },
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="glass-panel p-8 rounded-2xl border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              AI AGENT: GEMINI 2.0 FLASH
            </span>
            <StatusBadge status="ACTIVE" label="REASONING READY" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Persona & Knowledge Vault
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Configure system rules, inject business facts, and test your AI agent live before deploying to WhatsApp.
          </p>
        </div>

        <CyberButton
          variant="primary"
          icon={<Save className="w-4 h-4 text-slate-950" />}
          onClick={handleSaveSettings}
        >
          {savedSuccess ? "Saved to Memory!" : "Save Configuration"}
        </CyberButton>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Knowledge context & system prompt updated in embedded database.
        </div>
      )}

      {/* 2-Column Layout: Knowledge Config & Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Persona & Knowledge Vault */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Persona & Knowledge Base
            </h2>
            <span className="text-[11px] font-mono text-slate-400">CLIENT: PRESTIGE HEIGHTS</span>
          </div>

          {/* Dedicated Gemini API Key & Model Configuration */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
                Google Gemini Engine Settings (Per Client)
              </span>
              <span className="text-[10px] font-mono text-cyan-400">OPTIONAL OVERRIDE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Client Gemini API Key:
                </label>
                <input
                  type="password"
                  placeholder="Leave empty to use Admin's shared master key"
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-cyan-500/50 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  AI Model Series:
                </label>
                <select className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-cyan-500/50">
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-Fast & Cost-Efficient)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Complex Reasoning)</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Allows you to either provide your agency's shared API key or let the client provide their own Google Cloud Gemini key so token costs bill directly to their account.
            </p>
          </div>

          {/* Quick Niche Presets */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">
              1-Click Industry Persona Preset:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "REAL_ESTATE", name: "🏢 Real Estate" },
                { id: "HEALTHCARE", name: "💊 Clinic & Health" },
                { id: "RETAIL", name: "🛍️ Retail Store" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-center ${
                    selectedPreset === p.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "bg-black/30 text-slate-400 hover:text-white border border-white/5"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* System Prompt / Persona */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              System Prompt & Etiquette Instructions:
            </label>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs leading-relaxed focus:border-cyan-500/50 outline-none resize-none font-mono"
            />
          </div>

          {/* Business Knowledge Context */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Business Knowledge Context (FAQs, Pricing, Services, Operating Hours):
            </label>
            <textarea
              rows={8}
              value={knowledgeContext}
              onChange={(e) => setKnowledgeContext(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs leading-relaxed focus:border-cyan-500/50 outline-none resize-none font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Gemini references these exact facts to answer questions with zero hallucination.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive AI Test Simulator */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 flex flex-col h-[600px]">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-400" />
              Live AI Sandbox Simulator
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SIMULATOR ACTIVE
            </span>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
            {simMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 border border-violet-500/30">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-medium rounded-tr-sm"
                      : "bg-white/[0.05] text-slate-200 border border-white/5 rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSimulating && (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic pl-10">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Gemini is composing response...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendSim} className="flex gap-2 pt-3 border-t border-white/5">
            <input
              type="text"
              placeholder="Ask a question (e.g. How much is a 2BHK?)..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-500/50 outline-none"
            />
            <CyberButton
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSimulating}
              icon={<Send className="w-3.5 h-3.5 text-slate-950" />}
            >
              Send
            </CyberButton>
          </form>
        </div>
      </div>
    </div>
  );
}
