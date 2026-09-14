import { NextResponse } from "next/server"
import { fetchLineups } from "@/lib/fetchLineups"
import { fetchTeamStats } from "@/lib/fetchTeamStats"
import { calculateTeamRating } from "@/lib/calculateTeamRating"
import { generateSignal } from "@/lib/generateSignal"
import { fetchMatchOdds } from "@/lib/fetchMatchOdds"
import { teamRatings } from "@/lib/teamRatings"
import { computeCombinedLineupTotals } from "@/lib/lineupUtils"
import { requireActiveSubscription } from "@/lib/requireSubscription"

const API_KEY = process.env.API_FOOTBALL_KEY
const TEST_STATS_SEASON = 2024

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

    const fixtures = data.response || []

    console.log("FIXTURES COUNT:", fixtures.length)

    const matches = await Promise.all(
      fixtures.slice(0, 2).map(async (item: Fixture) => {
        const fixtureId = item.fixture.id
        const useTeamStats = true
        const rawSeason = item.league.season || TEST_STATS_SEASON

const statsSeason =
  rawSeason > 2024 ? TEST_STATS_SEASON : rawSeason


        console.log(
          "FIXTURE DEBUG",
          item.fixture.id,
          item.league.name,
          item.league.id,
          item.league.season,
          item.teams.home.name,
          item.teams.away.name
        )

        let homeRating = teamRatings[item.teams.home.name] || 70
        let awayRating = teamRatings[item.teams.away.name] || 70

        if (useTeamStats) {
          try {
            const [homeStats, awayStats] = await Promise.all([
              fetchTeamStats(
                item.teams.home.id,
                item.league.id,
                statsSeason
              ),
              fetchTeamStats(
                item.teams.away.id,
                item.league.id,
                statsSeason
              ),
            ])

            console.log(
              "STATS CHECK:",
              item.teams.home.name,
              homeStats?.fixtures?.played?.total,
              "|",
              item.teams.away.name,
              awayStats?.fixtures?.played?.total
            )

            if (homeStats?.fixtures) {
              homeRating = calculateTeamRating(homeStats)
              console.log(
                "HOME RATING CALCULATED:",
                item.teams.home.name,
                homeRating
              )
            }

            if (awayStats?.fixtures) {
              awayRating = calculateTeamRating(awayStats)
              console.log(
                "AWAY RATING CALCULATED:",
                item.teams.away.name,
                awayRating
              )
            }

            console.log(
              "FINAL RATINGS:",
              item.teams.home.name,
              homeRating,
              "|",
              item.teams.away.name,
              awayRating
            )
          } catch (error) {
            console.error("TEAM STATS PROCESSING ERROR", error)
          }
        }

        const lineups = await fetchLineups(fixtureId, {
          home: item.teams.home.name,
          away: item.teams.away.name,
          date: item.fixture.date,
        })

        console.log(
          "LINEUP CHECK:",
          fixtureId,
          item.teams.home.name,
          "vs",
          item.teams.away.name,
          "lineups:",
          lineups.length
        )

        let combinedLineupTotals = null

        if (lineups.length > 0) {
          try {
            const combined = await computeCombinedLineupTotals(lineups)
            combinedLineupTotals = combined
          } catch (e) {
            console.warn("Failed computing combined lineup totals", e)
          }
        }

        const signalResult = generateSignal(homeRating, awayRating)
        const matchOdds = await fetchMatchOdds(fixtureId)
        const selectedOdds = signalResult.signal === "HOME WIN"
          ? matchOdds?.home
          : signalResult.signal === "AWAY WIN"
            ? matchOdds?.away
            : null
        const modelProbability = signalResult.confidence / 100
        const impliedProbability = selectedOdds ? 1 / selectedOdds : null
        const valuePercent = impliedProbability
          ? Math.round((modelProbability - impliedProbability) * 100)
          : null

        return {
          fixtureId,
          homeTeam: item.teams.home.name,
          awayTeam: item.teams.away.name,
          signal: signalResult.signal,
          confidence: signalResult.confidence,
          odds: selectedOdds ? selectedOdds.toFixed(2) : null,
          valuePercent,
          valueLabel: valuePercent === null
            ? "Unavailable"
            : valuePercent >= 5
              ? "Potential value"
              : valuePercent <= -5
                ? "Potentially overpriced"
                : "Fairly priced",
          homeRating,
          awayRating,
          hasLineups: lineups.length > 0,
          combinedLineupTotals,
        }
      })
    )

    return NextResponse.json(matches)
  } catch (error) {
    console.error("MATCHES API ERROR:", error)
    const message = error instanceof Error ? error.message : "Unknown matches error"
    return NextResponse.json(
      { error: `Failed to fetch matches: ${message}` },
      { status: 500 }
    )
  }
}