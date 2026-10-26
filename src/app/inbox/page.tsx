"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  CheckCheck,
  Filter,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "HOT" | "TAKEOVER">("ALL");
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Drafts cache per contact so switching conversations preserves typed text
  const draftsRef = useRef<{ [contactId: string]: string }>({});
  // Scroll anchor ref for smooth, non-intrusive auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSuggestDraft = async () => {
    if (!selectedContact) return;
    setIsGeneratingDraft(true);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_draft",
          contactId: selectedContact.id,
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setAiDraft(data.draft);
      }
    } catch (e) {
      console.error("Error generating draft:", e);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

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
        setSelectedContact((prev) => {
          // If query param contactId provided in browser URL, select it directly
          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const targetId = urlParams.get("contactId");
            if (targetId) {
              const directMatch = formatted.find((item) => item.id === targetId);
              if (directMatch) return directMatch;
            }
          }

          if (!prev) return formatted[0];
          // Preserve currently selected contact with updated metadata
          const matched = formatted.find((item) => item.id === prev.id);
          return matched || prev;
        });
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
      // Restore draft input for selected contact
      setReplyInput(draftsRef.current[selectedContact.id] || "");
      fetchContactMessages(selectedContact.id);
      const msgInterval = setInterval(() => fetchContactMessages(selectedContact.id), 3000);
      return () => clearInterval(msgInterval);
    }
  }, [selectedContact?.id]);

  // Auto-scroll to latest message when messages array updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSelectContact = (contact: ContactItem) => {
    if (selectedContact) {
      // Save draft before switching
      draftsRef.current[selectedContact.id] = replyInput;
    }
    setAiDraft(null);
    setSelectedContact(contact);
  };

  const handleReplyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReplyInput(val);
    if (selectedContact) {
      draftsRef.current[selectedContact.id] = val;
    }
  };

  // Filtered contacts based on search and active tab
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.lastMessage.toLowerCase().includes(q);

      if (!matchQuery) return false;
      if (activeFilter === "HOT") return c.leadScore === "HOT";
      if (activeFilter === "TAKEOVER") return c.isHumanTakeover;
      return true;
    });
  }, [contacts, searchQuery, activeFilter]);

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

  const handlePromoteToLead = async () => {
    if (!selectedContact) return;
    try {
      const res = await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedContact.id,
          tags: "LEAD, WHATSAPP_ACTIVE",
          leadScore: "HOT",
        }),
      });
      if (res.ok) {
        const updated = {
          ...selectedContact,
          tags: "LEAD, WHATSAPP_ACTIVE",
          leadScore: "HOT" as const,
        };
        setSelectedContact(updated);
        setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? updated : c)));
      }
    } catch (e) {
      console.error("Error promoting to lead:", e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !selectedContact) return;

    const textToSend = replyInput;
    setReplyInput("");

    // Optimistic UI update: instantly append human message bubble
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { sender: "human", text: textToSend, time: nowTime },
    ]);

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
              <span className="text-[11px] font-mono text-cyan-400">
                {filteredContacts.length} of {contacts.length}
              </span>
            </div>

            {/* Instant Client-Side Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search phone or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-500/40 focus:border-cyan-500 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => setActiveFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                  activeFilter === "ALL"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                All ({contacts.length})
              </button>
              <button
                onClick={() => setActiveFilter("HOT")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                  activeFilter === "HOT"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                🔥 Hot Leads
              </button>
              <button
                onClick={() => setActiveFilter("TAKEOVER")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                  activeFilter === "TAKEOVER"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                👤 Takeover
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
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
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <Search className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No conversations match criteria</p>
              </div>
            )}
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
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white">{selectedContact.name}</h3>
                      <span className="text-[10px] font-mono text-cyan-400">({selectedContact.phone})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedContact.isHumanTakeover ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5" /> Human Takeover
                        </span>
                      ) : (selectedContact.tags || "").toUpperCase().includes("LEAD") ||
                        (selectedContact.tags || "").toUpperCase().includes("CAMPAIGN") ||
                        (selectedContact.tags || "").toUpperCase().includes("INBOUND") ||
                        (selectedContact.tags || "").toUpperCase().includes("VIP") ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5" /> AI Active (Guarded)
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-slate-400" /> Historical / Muted
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-slate-500">Tags: {selectedContact.tags || "None"}</span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2">
                  {!((selectedContact.tags || "").toUpperCase().includes("LEAD") ||
                    (selectedContact.tags || "").toUpperCase().includes("CAMPAIGN") ||
                    (selectedContact.tags || "").toUpperCase().includes("INBOUND") ||
                    (selectedContact.tags || "").toUpperCase().includes("VIP")) && (
                    <button
                      onClick={handlePromoteToLead}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-pointer transition-all flex items-center gap-1"
                      title="Promote this contact to LEAD to enable AI auto-replies"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Promote to Lead
                    </button>
                  )}

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
                        Takeover Active (AI Paused)
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5" />
                        Take Over
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
                {/* Scroll Anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Shadow AI Draft Suggestion Box */}
              {aiDraft && (
                <div className="mx-3 my-2 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0 animate-pulse" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">AI Suggested Draft (Shadow Assist)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">Gemini 2.5 Flash</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed italic">"{aiDraft}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyInput(aiDraft);
                        setAiDraft(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold border border-cyan-500/40 cursor-pointer transition-all"
                    >
                      Insert Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiDraft(null)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] cursor-pointer transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Reply Bar */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-white/5 bg-black/30 flex gap-2">
                <input
                  type="text"
                  placeholder={
                    selectedContact.isHumanTakeover
                      ? "Type manual message to WhatsApp customer..."
                      : "Type manual reply or click 'Suggest AI Draft'..."
                  }
                  value={replyInput}
                  onChange={handleReplyInputChange}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-500/50 outline-none font-sans"
                />
                <button
                  type="button"
                  onClick={handleSuggestDraft}
                  disabled={isGeneratingDraft}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium cursor-pointer transition-all disabled:opacity-50"
                  title="Generate contextual AI suggestion without sending"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-violet-400 ${isGeneratingDraft ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{isGeneratingDraft ? "Thinking..." : "Suggest AI Draft"}</span>
                </button>
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
