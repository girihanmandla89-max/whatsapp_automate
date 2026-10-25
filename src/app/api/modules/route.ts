import { NextResponse } from "next/server";
import { NICHE_MODULES_REGISTRY } from "@/lib/modulesRegistry";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || "default-client-1";

  const client = await prisma.clientWorkspace.findUnique({
    where: { id: clientId },
  });

  const enabledModules = client?.enabledModules
    ? client.enabledModules.split(",").map((m) => m.trim())
    : ["MOD_REALESTATE", "MOD_BROADCAST", "MOD_DOCS"];

  return NextResponse.json({
    modules: NICHE_MODULES_REGISTRY,
    enabledModules,
    clientIndustry: client?.industry || "Real Estate",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientId = body.clientId || "default-client-1";

    // Action 1: Toggle specific module on/off
    if (body.action === "toggle_module") {
      const client = await prisma.clientWorkspace.findUnique({
        where: { id: clientId },
      });

      let currentModules = client?.enabledModules
        ? client.enabledModules.split(",").map((m) => m.trim())
        : ["MOD_BROADCAST"];

      if (body.enable) {
        if (!currentModules.includes(body.moduleId)) {
          currentModules.push(body.moduleId);
        }
      } else {
        currentModules = currentModules.filter((m) => m !== body.moduleId);
      }

      await prisma.clientWorkspace.upsert({
        where: { id: clientId },
        update: { enabledModules: currentModules.join(",") },
        create: {
          id: clientId,
          name: "Default Client Workspace",
          enabledModules: currentModules.join(","),
        },
      });

      return NextResponse.json({ success: true, enabledModules: currentModules });
    }

    // Action 2: Apply 1-Click Niche Preset
    if (body.action === "apply_niche_preset") {
      let targetModules: string[] = ["MOD_BROADCAST", "MOD_DOCS"];
      let defaultPrompt = "";

      if (body.industry === "Real Estate") {
        targetModules = ["MOD_REALESTATE", "MOD_BROADCAST", "MOD_DOCS"];
        defaultPrompt = "You are an executive property consultant. Guide customers through luxury residences and book site visits.";
      } else if (body.industry === "Healthcare") {
        targetModules = ["MOD_HEALTHCARE", "MOD_SUPPORT", "MOD_BROADCAST"];
        defaultPrompt = "You are a clinic receptionist. Book appointments and provide clinic timings. NEVER diagnose medical symptoms.";
      } else if (body.industry === "Retail & Commerce") {
        targetModules = ["MOD_ECOMMERCE", "MOD_BROADCAST", "MOD_DOCS"];
        defaultPrompt = "You are a helpful retail shopping assistant. Assist with product inquiries and offer discount code SUMMER15.";
      } else if (body.industry === "Support") {
        targetModules = ["MOD_SUPPORT", "MOD_DOCS"];
        defaultPrompt = "You are a customer support executive. Triage issues, issue tickets, and assist users professionally.";
      }

      await prisma.clientWorkspace.upsert({
        where: { id: clientId },
        update: {
          industry: body.industry,
          enabledModules: targetModules.join(","),
          systemPrompt: defaultPrompt,
        },
        create: {
          id: clientId,
          name: "Default Client Workspace",
          industry: body.industry,
          enabledModules: targetModules.join(","),
          systemPrompt: defaultPrompt,
        },
      });

      return NextResponse.json({ success: true, industry: body.industry, enabledModules: targetModules });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
