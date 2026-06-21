import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const body = await req.text();
    const res = await fetch(backendUrl(`/api/cart/${sessionId}/checkout-info`), {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
