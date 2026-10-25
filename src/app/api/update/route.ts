import { NextResponse } from "next/server";
import {
  checkForSystemUpdates,
  executeSafeUpdate,
  runSystemMaintenance,
} from "@/lib/autoUpdater";

export async function GET() {
  const status = await checkForSystemUpdates();
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Action 1: Execute Safe GitHub Update
    if (body.action === "update_now") {
      const result = await executeSafeUpdate();
      return NextResponse.json(result);
    }

    // Action 2: Run Database & File Maintenance Clean-up
    if (body.action === "run_maintenance") {
      const result = await runSystemMaintenance();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
