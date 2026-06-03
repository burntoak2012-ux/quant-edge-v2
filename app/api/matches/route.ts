import { NextResponse } from "next/server"
import { fetchLineups } from "@/lib/fetchLineups"
import { fetchTeamStats } from "@/lib/fetchTeamStats"
import { calculateTeamRating } from "@/lib/calculateTeamRating"
import { calculateLineupRating } from "@/lib/calculateLineupRating"
import { generateSignal } from "@/lib/generateSignal"
import { teamRatings } from "@/lib/teamRatings"

const API_KEY = process.env.API_FOOTBALL_KEY
const TEST_STATS_SEASON = 2024

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]

    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${today}&status=NS`,
      {
        headers: {
          "x-apisports-key": API_KEY || "",
        },
        cache: "no-store",
      }
    )

    const data = await res.json()
    const fixtures = data.response || []

    console.log("FIXTURES COUNT:", fixtures.length)

    const matches = await Promise.all(
      fixtures.slice(0, 20).map(async (item: any, index: number) => {
        const fixtureId = item.fixture.id
        const useTeamStats = index === 0

        const lineups = await fetchLineups(fixtureId)

        console.log(
          "LINEUP CHECK:",
          fixtureId,
          item.teams.home.name,
          "vs",
          item.teams.away.name,
          "lineups:",
          lineups.length
        )

        let homeRating = teamRatings[item.teams.home.name] || 70
        let awayRating = teamRatings[item.teams.away.name] || 70

        if (useTeamStats) {
          try {
            const [homeStats, awayStats] = await Promise.all([
              fetchTeamStats(
                item.teams.home.id,
                item.league.id,
                TEST_STATS_SEASON
              ),
              fetchTeamStats(
                item.teams.away.id,
                item.league.id,
                TEST_STATS_SEASON
              ),
            ])

            if (homeStats?.fixtures) {
              homeRating = calculateTeamRating(homeStats)
            }

            if (awayStats?.fixtures) {
              awayRating = calculateTeamRating(awayStats)
            }
          } catch (error) {
            console.error("TEAM STATS ERROR:", error)
          }
        }

        if (lineups.length >= 2) {
          const homeLineup = lineups.find(
            (l: any) => l.team.id === item.teams.home.id
          )

          const awayLineup = lineups.find(
            (l: any) => l.team.id === item.teams.away.id
          )

          if (homeLineup) {
            homeRating = calculateLineupRating(
              homeLineup.startXI || []
            ).average
          }

          if (awayLineup) {
            awayRating = calculateLineupRating(
              awayLineup.startXI || []
            ).average
          }
        }

        const signalResult = generateSignal(homeRating, awayRating)

        return {
          fixtureId,
          homeTeam: item.teams.home.name,
          awayTeam: item.teams.away.name,
          signal: signalResult.signal,
          confidence: signalResult.confidence,
          odds: "1.95",
          homeRating,
          awayRating,
          hasLineups: lineups.length >= 2,
        }
      })
    )

    return NextResponse.json(matches)
  } catch (error) {
    console.error("MATCHES API ERROR:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch matches",
      },
      {
        status: 500,
      }
    )
  }
}
