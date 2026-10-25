"use client";

import React, { useState } from "react";
import {
  MessageSquareCode,
  Users,
  Radio,
  Sliders,
  Shield,
  Layers,
  ChevronDown,
  Sparkles,
  Search,
} from "lucide-react";
import { CyberButton } from "../ui/CyberButton";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ClientOption {
  id: string;
  name: string;
  industry: string;
  status: "CONNECTED" | "DISCONNECTED";
}

export const TopNavigation: React.FC = () => {
  const pathname = usePathname();
  const [selectedClient, setSelectedClient] = useState<ClientOption>({
    id: "default-client-1",
    name: "Prestige Heights Realty",
    industry: "Real Estate",
    status: "CONNECTED",
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const mockClients: ClientOption[] = [
    { id: "1", name: "Prestige Heights Realty", industry: "Real Estate", status: "CONNECTED" },
    { id: "2", name: "Apollo Dental Clinic", industry: "Healthcare", status: "CONNECTED" },
    { id: "3", name: "Luxe Retail Store", industry: "Retail & Commerce", status: "DISCONNECTED" },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-white/5 bg-[#07090e]/80 backdrop-blur-xl px-6 flex items-center justify-between">
      {/* Brand & Client Switcher */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-[1px] shadow-[0_0_15px_-2px_rgba(0,242,254,0.4)]">
            <div className="w-full h-full bg-[#07090e] rounded-xl flex items-center justify-center">
              <MessageSquareCode className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">
                NEXUS<span className="text-cyan-400 font-mono">.AI</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-500">WhatsApp Automation HUD</p>
          </div>
        </Link>

        {/* Vertical Divider */}
        <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

        {/* Dynamic Client Selector */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl glass-panel text-left cursor-pointer border-white/10 hover:border-cyan-500/30 transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            <div>
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {selectedClient.name}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {selectedClient.industry}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-2" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl glass-panel-glow border-white/10 p-2 z-50 shadow-2xl">
              <div className="px-2 py-1.5 text-[11px] font-mono text-slate-400 uppercase border-b border-white/5 mb-1 flex items-center justify-between">
                <span>Switch Client</span>
                <span className="text-cyan-400">3 Total</span>
              </div>
              <div className="space-y-1">
                {mockClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      selectedClient.id === client.id
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-[10px] text-slate-500">{client.industry}</p>
                    </div>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        client.status === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Nav Links */}
      <nav className="hidden lg:flex items-center gap-1 glass-panel px-3 py-1 rounded-full border-white/5">
        {[
          { name: "Overview", href: "/" },
          { name: "Contacts", href: "/contacts" },
          { name: "Live Inbox", href: "/inbox" },
          { name: "Campaigns & Forms", href: "/campaigns" },
          { name: "AI Brain & Rules", href: "/ai-brain" },
          { name: "Modules", href: "/modules" },
        ].map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <CyberButton variant="secondary" size="sm" icon={<Shield className="w-3.5 h-3.5 text-violet-400" />}>
            Super Admin
          </CyberButton>
        </Link>
      </div>
    </header>
  );
};
