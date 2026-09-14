import { NextResponse } from "next/server"
import { generateSignal } from "@/lib/generateSignal"
import { teamRatings } from "@/lib/teamRatings"
import { requireActiveSubscription } from "@/lib/requireSubscription"

export const dynamic = "force-dynamic"

const API_KEY = process.env.API_FOOTBALL_KEY
const TARGET_LEAGUE_IDS = new Set([
  39,  // Premier League
  140, // La Liga
  78,  // Bundesliga
  135, // Serie A
  61,  // Ligue 1
  2,   // UEFA Champions League
  3,   // UEFA Europa League
  848, // UEFA Europa Conference League
])
const configuredFixtureLimit = Number.parseInt(process.env.MATCH_LIMIT || "10", 10)
const MAX_FIXTURES = Number.isFinite(configuredFixtureLimit) && configuredFixtureLimit > 0
  ? Math.min(configuredFixtureLimit, 20)
  : 10

type Fixture = {
  fixture: { id: number; date?: string }
  league: { id: number; name?: string; season?: number }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
}

export async function GET() {
  try {
    const access = await requireActiveSubscription()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!API_KEY) {
      return NextResponse.json(
        { error: "API_FOOTBALL_KEY is not configured" },
        { status: 503 }
      )
    }

    const today = new Date().toISOString().slice(0, 10)

    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${today}`,
      {
        headers: {
          "x-apisports-key": API_KEY || "",
        },
        cache: "no-store",
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: "Football data provider unavailable" },
        { status: 502 }
      )
    }

    const data = await res.json()
    console.log("FULL API RESPONSE:", data)
console.log("API ERRORS:", data.errors)

    if (data.errors?.plan) {
      return NextResponse.json(
        { error: data.errors.plan },
        { status: 503 }
      )
    }

    const fixtures = (data.response || []).filter((item: Fixture) =>
      TARGET_LEAGUE_IDS.has(Number(item.league?.id))
    )

    console.log("FIXTURES COUNT:", fixtures.length)

    const matches = await Promise.all(
      fixtures.slice(0, MAX_FIXTURES).map(async (item: Fixture) => {
        const fixtureId = item.fixture.id
        let homeRating = teamRatings[item.teams.home.name] || 70
        let awayRating = teamRatings[item.teams.away.name] || 70

        const signalResult = generateSignal(homeRating, awayRating)

        return {
          fixtureId,
          leagueName: item.league.name || "European competition",
          homeTeam: item.teams.home.name,
          awayTeam: item.teams.away.name,
          signal: signalResult.signal,
          confidence: signalResult.confidence,
          odds: null,
          valuePercent: null,
          valueLabel: "Unavailable",
          homeRating,
          awayRating,
          hasLineups: false,
          combinedLineupTotals: null,
        }
      })
    )

    return NextResponse.json(matches, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (error) {
    console.error("MATCHES API ERROR:", error)
    const message = error instanceof Error ? error.message : "Unknown matches error"
    return NextResponse.json(
      { error: `Failed to fetch matches: ${message}` },
      { status: 500 }
    )
  }
}