"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  Users,
  MessageSquare,
  Bot,
  Zap,
  ArrowUpRight,
  Sparkles,
  Smartphone,
  BatteryCharging,
  Send,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Unplug,
} from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeviceModal } from "@/components/hud/DeviceModal";

export default function DashboardPage() {
  const [showPairModal, setShowPairModal] = useState(false);
  const [waSession, setWaSession] = useState<{
    status: "CONNECTED" | "DISCONNECTED" | "INITIALIZING" | "QR_READY";
    deviceInfo?: {
      phoneNumber?: string;
      platform?: string;
      battery?: number;
    };
  }>({
    status: "DISCONNECTED",
    deviceInfo: {},
  });

  const fetchLiveWaStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp?clientId=default-client-1");
      const data = await res.json();
      setWaSession({
        status: data.status || "DISCONNECTED",
        deviceInfo: data.deviceInfo || {},
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLiveWaStatus();
    const interval = setInterval(fetchLiveWaStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    try {
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", clientId: "default-client-1" }),
      });
      fetchLiveWaStatus();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero HUD Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-8 border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                ACTIVE WORKSPACE: PRESTIGE HEIGHTS REALTY
              </span>
              <StatusBadge status={waSession.status} />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Autonomous WhatsApp AI Orchestrator
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Google Gemini agent configured with Real Estate knowledge context, automatic WhatsApp lead capture, and instant Excel synchronization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CyberButton
              variant="secondary"
              icon={<QrCode className="w-4 h-4 text-cyan-400" />}
              onClick={() => setShowPairModal(true)}
            >
              Scan Device QR
            </CyberButton>
            <CyberButton
              variant="primary"
              icon={<Zap className="w-4 h-4 text-slate-950" />}
            >
              Test Gemini AI
            </CyberButton>
          </div>
        </div>
      </div>

      {/* Vital Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Customers Served",
            value: "1,248",
            sub: "+18% from last week",
            icon: <Users className="w-5 h-5 text-cyan-400" />,
            color: "cyan",
          },
          {
            title: "Messages Automated",
            value: "8,920",
            sub: "99.4% AI Accuracy",
            icon: <MessageSquare className="w-5 h-5 text-violet-400" />,
            color: "violet",
          },
          {
            title: "Leads Exported to Excel",
            value: "312",
            sub: "Synced to Client Sheet",
            icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
            color: "emerald",
          },
          {
            title: "AI Response Latency",
            value: "1.1s",
            sub: "Gemini 2.0 Flash Core",
            icon: <Bot className="w-5 h-5 text-amber-400" />,
            color: "amber",
          },
        ].map((card, idx) => (
          <div key={idx} className="glass-panel p-5 rounded-2xl border-white/5 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">{card.title}</span>
              <div className="p-2 rounded-xl bg-white/5">{card.icon}</div>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-white tracking-tight">
                {card.value}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp Device Connection HUD & Active Lead Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active WhatsApp Device Telemetry */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              Connected Device Status
            </h3>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                waSession.status === "CONNECTED"
                  ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                  : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
              }`}
            />
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Status:</span>
              <span
                className={`font-mono font-bold ${
                  waSession.status === "CONNECTED" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {waSession.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">WhatsApp Number:</span>
              <span className="text-cyan-400 font-mono font-medium">
                {waSession.deviceInfo?.phoneNumber || (waSession.status === "CONNECTED" ? "Active" : "Not Linked")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Device Platform:</span>
              <span className="text-slate-200 font-mono">
                {waSession.deviceInfo?.platform || (waSession.status === "CONNECTED" ? "Multi-Device" : "Disconnected")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                Socket Mode:
              </span>
              <span className="text-emerald-400 font-mono font-medium">
                {waSession.status === "CONNECTED" ? "WebSocket Active" : "Standby / Ready"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {waSession.status === "CONNECTED" ? (
              <CyberButton
                variant="danger"
                size="sm"
                className="w-full"
                onClick={handleDisconnect}
                icon={<Unplug className="w-3.5 h-3.5" />}
              >
                Disconnect WhatsApp
              </CyberButton>
            ) : (
              <CyberButton
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => setShowPairModal(true)}
                icon={<QrCode className="w-3.5 h-3.5 text-slate-950" />}
              >
                Connect WhatsApp Device
              </CyberButton>
            )}
          </div>
        </div>

        {/* Live Conversation Stream Preview */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Recent Lead Conversations
              </h3>
              <p className="text-xs text-slate-500">Live feed from connected WhatsApp session</p>
            </div>
            <CyberButton variant="ghost" size="sm">
              View All in Live Inbox
            </CyberButton>
          </div>

          <div className="space-y-3">
            {[
              {
                name: "David Miller",
                phone: "+91 98111 22334",
                msg: "What are the prices for 3BHK villas?",
                reply: "Gemini: 3BHK villas start at ₹1.45 Cr with private garden. Would you like a site visit this Saturday?",
                time: "2 mins ago",
                badge: "HOT LEAD",
              },
              {
                name: "Sarah Jenkins",
                phone: "+91 94555 66778",
                msg: "Do you have floor plans available for download?",
                reply: "Gemini: Dispatched PDF Brochure & Master Plan directly to WhatsApp.",
                time: "8 mins ago",
                badge: "WARM",
              },
            ].map((chat, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200">{chat.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">{chat.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {chat.badge}
                    </span>
                    <span className="text-[10px] text-slate-500">{chat.time}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 italic">"{chat.msg}"</p>
                <p className="text-xs text-cyan-300 font-medium pl-2 border-l-2 border-cyan-500/50">
                  {chat.reply}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Baileys Device Modal */}
      <DeviceModal
        isOpen={showPairModal}
        onClose={() => setShowPairModal(false)}
        clientId="default-client-1"
      />
    </div>
  );
}
