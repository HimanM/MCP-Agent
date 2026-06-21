import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await fetch(backendUrl("/api/chat"), {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        Accept: "text/event-stream",
      },
      body,
      cache: "no-store",
    });

    if (!res.body) {
      return NextResponse.json({ error: "Empty backend response" }, { status: 502 });
    }

    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
