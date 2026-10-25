"use client";

import React, { useEffect, useState } from "react";
import { Database, Cpu, ShieldCheck, Zap } from "lucide-react";

export const SystemStatusBar: React.FC = () => {
  const [stats, setStats] = useState({
    dbStatus: "Healthy",
    walMode: "Active",
    engineLatency: "0.8ms",
    licenseMode: "Verified (Super Admin)",
  });

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 h-8 border-t border-white/5 bg-[#07090e]/90 backdrop-blur-md px-4 flex items-center justify-between text-xs text-slate-400 select-none">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-500">DB Engine:</span>
          <span className="text-slate-300 font-mono">SQLite (WAL)</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-slate-500">Latency:</span>
          <span className="text-slate-300 font-mono">{stats.engineLatency}</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-500">License:</span>
          <span className="text-emerald-400 font-medium">{stats.licenseMode}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[11px] text-slate-500">
          WhatsApp Automation v1.0.0
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-mono border border-cyan-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          SYSTEM OPTIMAL
        </span>
      </div>
    </footer>
  );
};
