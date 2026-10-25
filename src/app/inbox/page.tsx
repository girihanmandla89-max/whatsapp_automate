"use client";

import React, { useState, useEffect } from "react";
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
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [messages, setMessages] = useState<
    Array<{ sender: "customer" | "ai" | "human" | "system"; text: string; time: string }>
  >([]);
  const [replyInput, setReplyInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. Fetch live WhatsApp contacts
  const fetchLiveInbox = async () => {
    try {
      const res = await fetch("/api/inbox?clientId=default-client-1");
      const data = await res.json();
      if (data.contacts && data.contacts.length > 0) {
        const formatted: ContactItem[] = data.contacts.map((c: any) => ({
          id: c.id,
          name: c.name || c.phoneNumber,
          phone: c.phoneNumber,
          lastMessage: c.chatMessages?.[0]?.messageBody || "Connected",
          time: new Date(c.lastInteraction || c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isHumanTakeover: c.chatMessages?.[0]?.isHumanTakeover || false,
          leadScore: c.leadScore || "WARM",
          tags: c.tags || "LEAD",
        }));
        setContacts(formatted);
        if (!selectedContact) {
          setSelectedContact(formatted[0]);
        }
      }
    } catch (e) {
      console.error("Error fetching inbox contacts:", e);
    }
  };

  // 2. Fetch messages for selected contact
  const fetchContactMessages = async (contactId: string) => {
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_messages", contactId }),
      });
      const data = await res.json();
      if (data.messages) {
        const formatted = data.messages.map((m: any) => {
          let sender: "customer" | "ai" | "human" | "system" = "customer";
          if (m.senderType === "HUMAN_AGENT") sender = "human";
          else if (m.senderType === "AI_AGENT") sender = "ai";
          else if (m.senderType === "SYSTEM") sender = "system";

          return {
            sender,
            text: m.messageBody,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        });
        setMessages(formatted);
      }
    } catch (e) {
      console.error("Error fetching messages:", e);
    }
  };

  useEffect(() => {
    fetchLiveInbox();
    const interval = setInterval(fetchLiveInbox, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedContact?.id) {
      fetchContactMessages(selectedContact.id);
      const msgInterval = setInterval(() => fetchContactMessages(selectedContact.id), 3000);
      return () => clearInterval(msgInterval);
    }
  }, [selectedContact?.id]);

  const toggleTakeover = async () => {
    if (!selectedContact) return;
    const nextState = !selectedContact.isHumanTakeover;
    const updated = { ...selectedContact, isHumanTakeover: nextState };
    setSelectedContact(updated);
    setContacts(contacts.map((c) => (c.id === selectedContact.id ? updated : c)));

    try {
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_takeover",
          contactId: selectedContact.id,
          isHumanTakeover: nextState,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !selectedContact) return;

    const textToSend = replyInput;
    setReplyInput("");
    setIsLoading(true);

    try {
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_manual",
          contactId: selectedContact.id,
          messageText: textToSend,
        }),
      });
      fetchContactMessages(selectedContact.id);
    } catch (e) {
      console.error("Error sending reply:", e);
    } finally {
      setIsLoading(false);
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
                  selectedContact?.id === contact.id
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
          {selectedContact ? (
            <>
              {/* Active Contact Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-[1px]">
                    <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center font-bold text-sm text-white">
                      {selectedContact.name ? selectedContact.name[0] : "W"}
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
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                    <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
                    <p className="text-xs text-slate-300 font-medium">No previous messages in this conversation yet</p>
                    <p className="text-[11px] text-slate-500">Send a manual reply below or send a message from WhatsApp to start the live stream.</p>
                  </div>
                ) : (
                  messages.map((m, idx) => (
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
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 gap-4">
                            <span>{m.sender === "customer" ? selectedContact.name : m.sender === "ai" ? "Gemini AI" : "Staff (You)"}</span>
                            <span>{m.time}</span>
                          </div>
                          <p>{m.text}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
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
                  isLoading={isLoading}
                  icon={<Send className="w-3.5 h-3.5 text-slate-950" />}
                >
                  Reply WhatsApp
                </CyberButton>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <Inbox className="w-10 h-10 text-slate-600 animate-pulse" />
              <h3 className="text-sm font-semibold text-slate-300">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Pick any contact from the left pane or send a message to your WhatsApp number to begin live chat orchestration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
