import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { logEvent } from "@/lib/analytics"
import { lineupEmailConfigured } from "@/lib/sendLineupAlert"
import { supabase } from "@/lib/supabaseClient"

type SubscriptionRequest = {
  fixtureId?: number
  homeTeam?: string
  awayTeam?: string
  kickoff?: string
}

async function authenticatedUser() {
  const { userId } = await auth()
  if (!userId) return null
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress
  return email ? { userId, email } : null
}

export async function GET(request: Request) {
  const identity = await authenticatedUser()
  if (!identity) return NextResponse.json({ error: "Authentication and an email address are required" }, { status: 401 })
  if (!supabase) return NextResponse.json({ error: "Alerts are not configured" }, { status: 503 })

  const fixtureId = Number(new URL(request.url).searchParams.get("fixtureId"))
  if (!Number.isInteger(fixtureId)) return NextResponse.json({ error: "Invalid fixture" }, { status: 400 })

  const { data, error } = await supabase
    .from("lineup_alerts")
    .select("status")
    .eq("user_id", identity.userId)
    .eq("fixture_id", fixtureId)
    .neq("status", "canceled")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscribed: Boolean(data), status: data?.status || null })
}

export async function POST(request: Request) {
  try {
    const identity = await authenticatedUser()
    if (!identity) return NextResponse.json({ error: "Authentication and an email address are required" }, { status: 401 })
    if (!supabase || !lineupEmailConfigured()) return NextResponse.json({ error: "Email alerts are not configured" }, { status: 503 })

    const body = await request.json() as SubscriptionRequest
    const fixtureId = Number(body.fixtureId)
    const kickoff = body.kickoff ? new Date(body.kickoff) : null
    if (!Number.isInteger(fixtureId) || !body.homeTeam || !body.awayTeam || !kickoff || Number.isNaN(kickoff.getTime())) {
      return NextResponse.json({ error: "Invalid fixture details" }, { status: 400 })
    }

    const { error } = await supabase.from("lineup_alerts").upsert({
      user_id: identity.userId,
      email: identity.email,
      fixture_id: fixtureId,
      home_team: body.homeTeam.slice(0, 120),
      away_team: body.awayTeam.slice(0, 120),
      kickoff: kickoff.toISOString(),
      status: "pending",
      sent_at: null,
    }, { onConflict: "user_id,fixture_id" })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    void logEvent("lineup_alert_subscribed", identity.userId, { fixture_id: fixtureId })
    return NextResponse.json({ subscribed: true })
  } catch (error) {
    console.error("LINEUP ALERT SUBSCRIPTION ERROR", error)
    const detail = error instanceof Error ? error.message : "Unknown server error"
    return NextResponse.json({ error: `Unable to save lineup alert: ${detail}` }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const identity = await authenticatedUser()
  if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  if (!supabase) return NextResponse.json({ error: "Alerts are not configured" }, { status: 503 })

  const fixtureId = Number(new URL(request.url).searchParams.get("fixtureId"))
  if (!Number.isInteger(fixtureId)) return NextResponse.json({ error: "Invalid fixture" }, { status: 400 })

  const { error } = await supabase
    .from("lineup_alerts")
    .update({ status: "canceled" })
    .eq("user_id", identity.userId)
    .eq("fixture_id", fixtureId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscribed: false })
}