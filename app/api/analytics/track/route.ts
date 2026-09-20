import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { logEvent, type FunnelEvent } from "@/lib/analytics"

const ALLOWED_EVENTS: FunnelEvent[] = ["free_preview_view", "pricing_view", "checkout_start"]

export async function POST(req: Request) {
  try {
    const { event, metadata } = await req.json() as { event?: string; metadata?: Record<string, unknown> }

    if (!event || !ALLOWED_EVENTS.includes(event as FunnelEvent)) {
      return NextResponse.json({ error: "Unsupported event" }, { status: 400 })
    }

    const { userId } = await auth()
    await logEvent(event as FunnelEvent, userId, metadata || {})

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.warn("Analytics tracking request failed", error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
