import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const backendBase = process.env.NEXT_PUBLIC_API_URL;
  if (backendBase) {
    try {
      const res = await fetch(`${backendBase.replace(/\/$/, "")}/health`, {
        cache: "no-store",
      });
      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      console.error("Backend health proxy failed:", e);
      return NextResponse.json(
        { detail: `Unable to reach backend at ${backendBase}` },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
