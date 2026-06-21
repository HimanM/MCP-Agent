import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; productId: string }> }
) {
  const { sessionId, productId } = await params;
  try {
    const body = await req.text();
    const res = await fetch(backendUrl(`/api/cart/${sessionId}/item/${productId}`), {
      method: "PATCH",
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; productId: string }> }
) {
  const { sessionId, productId } = await params;
  try {
    const res = await fetch(backendUrl(`/api/cart/${sessionId}/item/${productId}`), {
      method: "DELETE",
      headers: { Accept: "application/json" },
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
