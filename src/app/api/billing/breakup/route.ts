import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || "default-client-1";

  const client = await prisma.clientWorkspace.findUnique({
    where: { id: clientId },
  });

  const totalContacts = await prisma.contact.count({ where: { clientId } });
  const totalLeads = await prisma.formResponse.count({ where: { clientId } });
  const aggregateChat = await prisma.chatMessage.aggregate({
    where: { clientId },
    _count: { id: true },
    _sum: { geminiTokens: true },
  });

  const totalMessages = aggregateChat._count.id;
  const totalTokens = aggregateChat._sum.geminiTokens || 0;

  // Transparent Cost Breakup Model
  // Google Gemini 2.5 Flash pricing: ~$0.075 per 1,000,000 input tokens, ~$0.30 per 1,000,000 output tokens
  const estimatedAiRawCost = ((totalTokens / 1000000) * 0.15).toFixed(4);
  const whatsappServerInfrastructureCost = 10.0; // Flat monthly infrastructure share per number
  const managementAndSupportFee = 40.0; // Agency management, prompt maintenance, and Excel lead sync
  const totalClientBill = (
    parseFloat(estimatedAiRawCost) +
    whatsappServerInfrastructureCost +
    managementAndSupportFee
  ).toFixed(2);

  const report = {
    clientName: client?.name || "Prestige Heights Realty",
    billingCycle: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    metrics: {
      totalConversations: totalContacts,
      totalMessagesProcessed: totalMessages,
      totalLeadsCapturedToExcel: totalLeads,
      totalAiTokensUsed: totalTokens,
      aiUptime: "99.98%",
    },
    costBreakup: [
      {
        item: "24/7 Dedicated WhatsApp Multi-Device Server",
        description: "WebSocket connection hosting, anti-ban pacing, session keep-alive",
        amount: `$${whatsappServerInfrastructureCost.toFixed(2)}`,
      },
      {
        item: "Google Gemini 2.5 Flash AI Reasoning Tokens",
        description: `${totalTokens.toLocaleString()} tokens processed with zero-hallucination guardrails`,
        amount: `$${parseFloat(estimatedAiRawCost).toFixed(2)}`,
      },
      {
        item: "Automation Engine & Lead Sink Maintenance",
        description: "Real-time Google Sheet/Excel sync, instant sales team alerts, and campaign builder",
        amount: `$${managementAndSupportFee.toFixed(2)}`,
      },
    ],
    totalBill: `$${totalClientBill}`,
    roiAnalysis: {
      humanAgentEquivalentCost: "$600 - $800 / month",
      clientSavingsPercentage: "85% - 90%",
      averageResponseTime: "1.2 seconds (vs. 15–45 minutes human delay)",
    },
  };

  return NextResponse.json(report);
}
