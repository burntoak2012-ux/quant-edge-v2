import { NextResponse } from "next/server"
import { generateSignal } from "@/lib/generateSignal"
import { teamRatings } from "@/lib/teamRatings"
import { calculateTeamRating } from "@/lib/calculateTeamRating"
import { calculateLineupRating } from "@/lib/calculateLineupRating"
import { fetchLineups } from "@/lib/fetchLineups"
import type { ApiLineup } from "@/lib/lineupUtils"
import { requireActiveSubscription } from "@/lib/requireSubscription"

export const dynamic = "force-dynamic"

const API_KEY = process.env.API_FOOTBALL_KEY
const RATING_BASELINE_SEASON = 2024
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
  fixture: { id: number; date?: string; status?: { short?: string; long?: string } }
  league: { id: number; name?: string; season?: number; round?: string }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
}

type TeamStatsResponse = {
  response?: Parameters<typeof calculateTeamRating>[0]
}

function findProjectedRating(
  ratings: Array<{ team: string; rating: number }> | null,
  teamName: string,
) {
  return ratings?.find((entry) => entry.team === teamName)?.rating || null
}

async function fetchTeamRating(teamId: number, leagueId: number, season: number) {
  try {
    for (const requestedSeason of [season, RATING_BASELINE_SEASON]) {
      if (requestedSeason === RATING_BASELINE_SEASON && season === RATING_BASELINE_SEASON) continue

      const response = await fetch(
        `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${requestedSeason}`,
        {
          headers: { "x-apisports-key": API_KEY || "" },
          next: { revalidate: 21600 },
        }
      )
      if (!response.ok) continue

      const data = await response.json() as TeamStatsResponse
      if (data.response) return calculateTeamRating(data.response)
    }

    return null
  } catch (error) {
    console.error("TEAM RATING ERROR", { teamId, leagueId, season, error })
    return null
  }
}

export async function GET(request: Request) {
  try {
    const access = await requireActiveSubscription()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!API_KEY) {
      return NextResponse.json(
        { error: "API_FOOTBALL_KEY is not configured" },
        { status: 503 }
      )
    }

    const requestedDate = new URL(request.url).searchParams.get("date")
    const today = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : new Date().toISOString().slice(0, 10)

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

    console.log("Fixture selection", {
      date: today,
      providerFixtures: data.response?.length || 0,
      qualifyingFixtures: fixtures.length,
      qualifyingLeagueIds: fixtures.map((item: Fixture) => item.league.id),
    })

    const selectedFixtures = fixtures.slice(0, MAX_FIXTURES)
    const ratingEntries = await Promise.all(
      selectedFixtures.flatMap((item: Fixture) => [
        fetchTeamRating(item.teams.home.id, item.league.id, item.league.season || new Date().getUTCFullYear()),
        fetchTeamRating(item.teams.away.id, item.league.id, item.league.season || new Date().getUTCFullYear()),
      ])
    )
    const projectedLineupEntries = await Promise.all(
      selectedFixtures.map((item: Fixture) => fetchProjectedLineupRatings(item.fixture.id))
    )

    const matches = await Promise.all(
      selectedFixtures.map(async (item: Fixture, index: number) => {
        const fixtureId = item.fixture.id
        const homeRating = ratingEntries[index * 2] || teamRatings[item.teams.home.name] || 70
        const awayRating = ratingEntries[index * 2 + 1] || teamRatings[item.teams.away.name] || 70
        const projectedLineups = projectedLineupEntries[index]
        const homeProjectedRating = findProjectedRating(projectedLineups, item.teams.home.name)
        const awayProjectedRating = findProjectedRating(projectedLineups, item.teams.away.name)

        const signalResult = generateSignal(homeProjectedRating || homeRating, awayProjectedRating || awayRating)

        return {
          fixtureId,
          kickoff: item.fixture.date || null,
          status: item.fixture.status?.long || item.fixture.status?.short || "Scheduled",
          leagueId: item.league.id,
          round: item.league.round || null,
          leagueName: item.league.name || "European competition",
          homeTeamId: item.teams.home.id,
          homeTeam: item.teams.home.name,
          awayTeamId: item.teams.away.id,
          awayTeam: item.teams.away.name,
          signal: signalResult.signal,
          confidence: signalResult.confidence,
          odds: null,
          valuePercent: null,
          valueLabel: "Unavailable",
          homeRating,
          awayRating,
          homeProjectedRating,
          awayProjectedRating,
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

async function fetchProjectedLineupRatings(fixtureId: number) {
  try {
    const lineups = await fetchLineups(fixtureId)
    const ratings = (lineups as ApiLineup[]).map((lineup) => ({
      team: lineup.team?.name || "Team",
      rating: calculateLineupRating(lineup.startXI || []).average,
    }))

    return ratings.length > 0 ? ratings : null
  } catch (error) {
    console.error("PROJECTED LINEUP RATING ERROR", { fixtureId, error })
    return null
  }
}