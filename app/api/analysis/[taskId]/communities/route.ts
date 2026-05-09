import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await context.params;

  const backendBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  try {
    const res = await fetch(
      `${backendBase.replace(/\/$/, "")}/api/analysis/${encodeURIComponent(taskId)}/communities`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("Backend community proxy failed:", e);
    return NextResponse.json(
      { error: `Unable to reach backend at ${backendBase}` },
      { status: 502 },
    );
  }
}
