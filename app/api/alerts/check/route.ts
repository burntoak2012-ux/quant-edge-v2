import { NextResponse } from "next/server"
import { calculateLineupRating } from "@/lib/calculateLineupRating"
import { fetchLineups } from "@/lib/fetchLineups"
import { logEvent } from "@/lib/analytics"
import { lineupEmailConfigured, sendLineupAlertEmail } from "@/lib/sendLineupAlert"
import { supabase } from "@/lib/supabaseClient"

export const dynamic = "force-dynamic"

type AlertRow = {
  id: number
  user_id: string
  email: string
  fixture_id: number
  home_team: string
  away_team: string
  kickoff: string
}

export async function GET(request: Request) {
  const suppliedSecret = request.headers.get("x-cron-secret")
    || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!process.env.CRON_SECRET || suppliedSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!supabase || !lineupEmailConfigured()) {
    return NextResponse.json({ error: "Lineup alerts are not configured" }, { status: 503 })
  }

  const now = Date.now()
  const windowStart = new Date(now - 3 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now + 2 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from("lineup_alerts")
    .select("id,user_id,email,fixture_id,home_team,away_team,kickoff")
    .eq("status", "pending")
    .gte("kickoff", windowStart)
    .lte("kickoff", windowEnd)
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const alerts = (data || []) as AlertRow[]
  const fixtureIds = [...new Set(alerts.map((alert) => alert.fixture_id))]
  let sent = 0

  for (const fixtureId of fixtureIds) {
    const fixtureAlerts = alerts.filter((alert) => alert.fixture_id === fixtureId)
    const lineups = (await fetchLineups(fixtureId)).filter((lineup) => !lineup.isProjected && (lineup.startXI?.length || 0) >= 11)
    if (lineups.length < 2) continue

    for (const alert of fixtureAlerts) {
      const homeLineup = lineups.find((lineup) => lineup.team?.name === alert.home_team)
      const awayLineup = lineups.find((lineup) => lineup.team?.name === alert.away_team)
      if (!homeLineup || !awayLineup) continue

      const { data: claimed } = await supabase
        .from("lineup_alerts")
        .update({ status: "processing" })
        .eq("id", alert.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle()
      if (!claimed) continue

      try {
        await sendLineupAlertEmail({
          to: alert.email,
          fixtureId,
          homeTeam: alert.home_team,
          awayTeam: alert.away_team,
          homeTotal: calculateLineupRating(homeLineup.startXI || []).total,
          awayTotal: calculateLineupRating(awayLineup.startXI || []).total,
        })
        await supabase.from("lineup_alerts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", alert.id)
        await logEvent("lineup_alert_sent", alert.user_id, { fixture_id: fixtureId })
        sent += 1
      } catch (sendError) {
        console.error("LINEUP ALERT SEND ERROR", { alertId: alert.id, sendError })
        await supabase.from("lineup_alerts").update({ status: "pending" }).eq("id", alert.id)
      }
    }
  }

  return NextResponse.json({ checked: alerts.length, fixtures: fixtureIds.length, sent })
}