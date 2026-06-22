import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";

export async function GET() {
  try {
    const res = await fetch(backendUrl("/api/meta"), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
