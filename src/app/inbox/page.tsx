"use client";

import React, { useState } from "react";
import {
  Inbox,
  User,
  Bot,
  UserCheck,
  Send,
  Phone,
  Search,
  Sparkles,
  AlertTriangle,
  Clock,
  Tag,
} from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  isHumanTakeover: boolean;
  leadScore: "HOT" | "WARM" | "COLD";
  tags: string;
}

export default function LiveInboxPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([
    {
      id: "c-1",
      name: "David Miller",
      phone: "+91 98111 22334",
      lastMessage: "What are the prices for 3BHK villas?",
      time: "2 mins ago",
      isHumanTakeover: false,
      leadScore: "HOT",
      tags: "VILLA_INTEREST",
    },
    {
      id: "c-2",
      name: "Sarah Jenkins",
      phone: "+91 94555 66778",
      lastMessage: "Do you have floor plans available for download?",
      time: "10 mins ago",
      isHumanTakeover: false,
      leadScore: "WARM",
      tags: "BROCHURE_SENT",
    },
    {
      id: "c-3",
      name: "Robert Fox",
      phone: "+91 91222 33445",
      lastMessage: "I want to speak with an executive directly.",
      time: "25 mins ago",
      isHumanTakeover: true,
      leadScore: "HOT",
      tags: "NEEDS_HUMAN",
    },
  ]);

  const [selectedContact, setSelectedContact] = useState<ContactItem>(contacts[0]);
  const [messages, setMessages] = useState<
    Array<{ sender: "customer" | "ai" | "human" | "system"; text: string; time: string }>
  >([
    {
      sender: "customer",
      text: "Hello, I am interested in buying an apartment at Prestige Heights.",
      time: "10:14 AM",
    },
    {
      sender: "ai",
      text: "Welcome to Prestige Heights! We have premium 2BHK and 3BHK residences. Are you looking for your personal home or investment?",
      time: "10:14 AM",
    },
    {
      sender: "customer",
      text: "What are the prices for 3BHK villas?",
      time: "10:16 AM",
    },
    {
      sender: "ai",
      text: "Our 3BHK luxury villas start at ₹1.45 Cr with private garden and 2-car covered parking. Would you like to schedule a private site visit this Saturday?",
      time: "10:16 AM",
    },
  ]);

  const [replyInput, setReplyInput] = useState("");

  const toggleTakeover = async () => {
    const nextState = !selectedContact.isHumanTakeover;
    const updated = { ...selectedContact, isHumanTakeover: nextState };
    setSelectedContact(updated);
    setContacts(contacts.map((c) => (c.id === selectedContact.id ? updated : c)));

    setMessages((prev) => [
      ...prev,
      {
        sender: "system",
        text: nextState
          ? "👤 Human Agent has taken over this conversation. AI Auto-Reply is paused."
          : "🤖 AI Auto-Reply has been resumed for this conversation.",
        time: "Just now",
      },
    ]);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        sender: "human",
        text: replyInput,
        time: "Just now",
      },
    ]);
    setReplyInput("");

    // Auto-enable human takeover if not already active
    if (!selectedContact.isHumanTakeover) {
      toggleTakeover();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 animate-in fade-in duration-500">
      {/* Header Bar */}
      <div className="flex items-center justify-between glass-panel px-6 py-3 rounded-2xl border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Unified Live Chat Inbox
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                LIVE SYNC
              </span>
            </h1>
            <p className="text-xs text-slate-400">Real-time WhatsApp messages with instant manual takeover</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status="CONNECTED" label="SOCKET LIVE" size="sm" />
        </div>
      </div>

      {/* Split-Pane Inbox Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {/* Left Pane: Contacts List */}
        <div className="glass-panel rounded-2xl border-white/5 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Active Conversations</span>
              <span className="text-[11px] font-mono text-cyan-400">3 Conversations</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search phone or name..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/5 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 cursor-pointer ${
                  selectedContact.id === contact.id
                    ? "bg-cyan-500/10 border-l-2 border-cyan-400"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{contact.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{contact.time}</span>
                </div>
                <p className="text-[11px] font-mono text-slate-400">{contact.phone}</p>
                <p className="text-xs text-slate-400 truncate">"{contact.lastMessage}"</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      contact.leadScore === "HOT"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    }`}
                  >
                    {contact.leadScore === "HOT" ? "🔥 HOT LEAD" : "🌱 WARM"}
                  </span>
                  {contact.isHumanTakeover ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      👤 HUMAN TAKEOVER
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      🤖 AI ACTIVE
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Pane: Active Chat & Human Takeover HUD */}
        <div className="md:col-span-2 glass-panel rounded-2xl border-white/5 flex flex-col overflow-hidden">
          {/* Active Contact Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-[1px]">
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center font-bold text-sm text-white">
                  {selectedContact.name[0]}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">{selectedContact.name}</h3>
                <p className="text-[11px] font-mono text-cyan-400">{selectedContact.phone}</p>
              </div>
            </div>

            {/* 1-Click Human Takeover Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTakeover}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  selectedContact.isHumanTakeover
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]"
                    : "bg-violet-500/20 text-violet-300 border-violet-500/50 hover:bg-violet-500/30"
                }`}
              >
                {selectedContact.isHumanTakeover ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Human Takeover (AI Paused) — Click to Resume AI
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    AI Handling — Click to Take Over
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.sender === "customer"
                    ? "items-start"
                    : m.sender === "system"
                    ? "items-center"
                    : "items-end"
                }`}
              >
                {m.sender === "system" ? (
                  <div className="px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] text-slate-400 font-mono my-1">
                    {m.text}
                  </div>
                ) : (
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed space-y-1 ${
                      m.sender === "customer"
                        ? "bg-white/[0.05] text-slate-200 border border-white/5 rounded-tl-sm"
                        : m.sender === "ai"
                        ? "bg-cyan-950/30 text-cyan-200 border border-cyan-500/30 rounded-tr-sm"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-medium rounded-tr-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{m.sender === "customer" ? selectedContact.name : m.sender === "ai" ? "Gemini 2.0 AI" : "Staff (You)"}</span>
                      <span>{m.time}</span>
                    </div>
                    <p>{m.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reply Bar */}
          <form onSubmit={handleSendReply} className="p-3 border-t border-white/5 bg-black/30 flex gap-2">
            <input
              type="text"
              placeholder={
                selectedContact.isHumanTakeover
                  ? "Type manual message to WhatsApp customer..."
                  : "Type to reply manually (auto-takes over from AI)..."
              }
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-500/50 outline-none"
            />
            <CyberButton
              type="submit"
              variant="primary"
              size="sm"
              icon={<Send className="w-3.5 h-3.5 text-slate-950" />}
            >
              Reply WhatsApp
            </CyberButton>
          </form>
        </div>
      </div>
    </div>
  );
}
