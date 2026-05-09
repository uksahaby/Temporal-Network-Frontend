import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalysisStatus = {
  status: "processing" | "completed" | "failed";
  task_id: string;
  message?: string;
  data?: any;
  error?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __analysisTasks: Map<string, unknown> | undefined;
}

function taskStore(): Map<string, AnalysisStatus> {
  if (!globalThis.__analysisTasks) globalThis.__analysisTasks = new Map();
  return globalThis.__analysisTasks as Map<string, AnalysisStatus>;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await context.params;

  const localTask = taskStore().get(taskId);
  if (localTask) {
    return NextResponse.json(localTask);
  }

  const backendBase = process.env.NEXT_PUBLIC_API_URL;
  if (backendBase) {
    try {
      const res = await fetch(
        `${backendBase.replace(/\/$/, "")}/api/analysis/${encodeURIComponent(taskId)}`,
        { cache: "no-store" },
      );

      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      console.error("Backend analysis proxy failed:", e);
      return NextResponse.json(
        { detail: `Unable to reach backend at ${backendBase}` },
        { status: 502 },
      );
    }
  }

  const task = taskStore().get(taskId);
  if (!task) {
    return NextResponse.json(
      { status: "failed", task_id: taskId, error: "Task not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(task);
}
