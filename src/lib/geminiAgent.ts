import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";

// Initialize Gemini Client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Niche Persona System Presets
export const PERSONA_PRESETS = {
  REAL_ESTATE: {
    name: "Real Estate Property Advisor",
    systemPrompt: `You are an executive property consultant for a luxury real estate agency. 
Your goal is to be polite, articulate, and understand the client's requirements: their ideal property type (1BHK/2BHK/Villa), investment budget, and timeline.
Highlight amenities (swimming pool, gym, clubhouse, gated security) and invite them for a site visit this weekend.
Strict Rule: If you do not have specific pricing or availability info, reply that our senior advisor will contact them shortly with exact floor plans.`,
  },
  HEALTHCARE: {
    name: "Clinic Patient Receptionist",
    systemPrompt: `You are an empathetic, professional medical clinic receptionist.
Your goal is to help patients book doctor appointments, explain clinic operating hours, and confirm specialist availability.
CRITICAL SAFETY RULE: You are NOT a doctor. NEVER diagnose symptoms, prescribe medications, or comment on critical conditions. If emergency, instruct the user to immediately visit the nearest emergency room or dial emergency services.`,
  },
  RETAIL: {
    name: "Retail & E-Commerce Concierge",
    systemPrompt: `You are a friendly, enthusiastic personal shopping assistant for a retail store.
Your goal is to help customers find matching clothing, shoes, or accessories, explain return policies, and provide promotional discount vouchers.
Keep replies engaging, concise, and offer quick reply suggestions.`,
  },
  GENERAL: {
    name: "Customer Support Executive",
    systemPrompt: `You are a helpful, professional customer support assistant for the business.
Answer inquiries accurately based solely on the provided business knowledge base. Keep answers concise and polite.`,
  },
};

export interface GeminiResponseResult {
  replyText: string;
  tokensUsed: number;
  isEscalated: boolean;
  leadScore: "HOT" | "WARM" | "COLD";
}

/**
 * Checks for customer frustration, anger, or explicit requests for human agent.
 */
export function checkEscalationKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  const escalationTriggers = [
    "talk to human",
    "real person",
    "human agent",
    "speak to agent",
    "manager",
    "scam",
    "fraud",
    "terrible service",
    "useless bot",
    "complaint",
    "sue you",
    "furious",
  ];
  return escalationTriggers.some((trigger) => lower.includes(trigger));
}

/**
 * Generates context-aware, token-optimized response using Google Gemini 2.0.
 */
export async function generateGeminiReply(
  clientId: string,
  contactId: string,
  customerMessage: string
): Promise<GeminiResponseResult> {
  // 1. Check for immediate human escalation
  if (checkEscalationKeywords(customerMessage)) {
    return {
      replyText: "I understand your request. I am pausing automated replies and connecting you directly to our human support team right now. An agent will be with you shortly.",
      tokensUsed: 0,
      isEscalated: true,
      leadScore: "HOT",
    };
  }

  // 2. Fetch Client Workspace settings and knowledge context from SQLite
  const client = await prisma.clientWorkspace.findUnique({
    where: { id: clientId },
  });

  const systemInstructions =
    client?.systemPrompt ||
    PERSONA_PRESETS.REAL_ESTATE.systemPrompt;

  const knowledgeContext = client?.knowledgeContext || `
Business Hours: Monday to Saturday 9:00 AM - 7:00 PM. Closed on Sundays.
Location: Central Business District, Prime Tower, 4th Floor.
Payment Methods: Credit/Debit Cards, UPI, Net Banking, and Bank Wire Transfer.
`;

  // 3. Sliding-Window Memory Buffer: Retrieve last 6 conversation turns
  const recentMessages = await prisma.chatMessage.findMany({
    where: { clientId, contactId },
    orderBy: { timestamp: "desc" },
    take: 6,
  });

  // Reverse to chronological order
  const chronologicalHistory = recentMessages.reverse();

  const formattedHistory = chronologicalHistory
    .map((m) => `${m.senderType === "CUSTOMER" ? "Customer" : "Assistant"}: ${m.messageBody}`)
    .join("\n");

  const fullPrompt = `
System Persona:
${systemInstructions}

Business Knowledge Context:
${knowledgeContext}

Strict Guardrail:
- Only state facts present in the knowledge context. If unknown, politely state our team will follow up.
- Keep responses friendly, professional, and under 80 words.

Conversation History:
${formattedHistory}

Customer: ${customerMessage}
Assistant:`;

  // 4. Resolve Dynamic Gemini Client (Use client's own key OR fallback to Admin master key)
  const effectiveKey = (client as any)?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY;
  const effectiveModel = (client as any)?.geminiModel?.trim() || "gemini-2.5-flash";

  if (!effectiveKey) {
    // Elegant fallback simulation if no API key is configured yet
    const simulatedReply = customerMessage.toLowerCase().includes("price")
      ? "Our 2BHK units start at ₹85 Lakhs and 3BHK luxury villas start at ₹1.45 Cr. Would you like to schedule a private site visit this weekend?"
      : "Thank you for reaching out! We would be delighted to assist you. Our office is open Mon-Sat 9 AM - 7 PM. How can we help you today?";

    return {
      replyText: simulatedReply,
      tokensUsed: 65,
      isEscalated: false,
      leadScore: "WARM",
    };
  }

  try {
    const clientGenAI = new GoogleGenAI({ apiKey: effectiveKey });
    const response = await clientGenAI.models.generateContent({
      model: effectiveModel,
      contents: fullPrompt,
    });

    const replyText = response.text || "Thank you for contacting us. How may we assist you today?";
    const tokensUsed = response.usageMetadata?.totalTokenCount || 75;

    // Detect lead quality based on purchase intent
    const isHotLead =
      customerMessage.toLowerCase().includes("buy") ||
      customerMessage.toLowerCase().includes("book") ||
      customerMessage.toLowerCase().includes("visit") ||
      customerMessage.toLowerCase().includes("cost");

    return {
      replyText: replyText.trim(),
      tokensUsed,
      isEscalated: false,
      leadScore: isHotLead ? "HOT" : "WARM",
    };
  } catch (err) {
    console.error("Gemini API error:", err);
    return {
      replyText: "Thank you for your message. Our team has received your inquiry and will respond directly shortly.",
      tokensUsed: 0,
      isEscalated: false,
      leadScore: "WARM",
    };
  }
}

/**
 * Generates an AI suggested reply draft based on the latest context of a conversation.
 * Designed for Live Inbox operators in Shadow Assist mode.
 */
export async function generateShadowDraft(clientId: string, contactId: string): Promise<string> {
  const lastCustomerMsg = await prisma.chatMessage.findFirst({
    where: { clientId, contactId, senderType: "CUSTOMER" },
    orderBy: { timestamp: "desc" },
  });

  const queryText = lastCustomerMsg?.messageBody || "Hello, I am inquiring about your available services.";
  const result = await generateGeminiReply(clientId, contactId, queryText);
  return result.replyText;
}
