import { NextResponse } from "next/server"
import { teamRatings } from "@/lib/teamRatings"
import { calculateTeamRating } from "@/lib/calculateTeamRating"
import { calculateMatchProbabilities } from "@/lib/matchProbability"
import { calculateLineupRating } from "@/lib/calculateLineupRating"
import { fetchLineups } from "@/lib/fetchLineups"
import { fetchMatchOdds } from "@/lib/fetchMatchOdds"
import type { ApiLineup } from "@/lib/lineupUtils"
import { getHistoricalRatingSnapshot } from "@/lib/historicalRatingSnapshots"
import { getSubscriptionAccess } from "@/lib/requireSubscription"
import { supabase } from "@/lib/supabaseClient"

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
  5,   // UEFA Nations League
  848, // UEFA Europa Conference League
  18,  // AFC Champions League Two
])
const configuredFixtureLimit = Number.parseInt(process.env.MATCH_LIMIT || "10", 10)
const MAX_FIXTURES = Number.isFinite(configuredFixtureLimit) && configuredFixtureLimit > 0
  ? Math.min(configuredFixtureLimit, 20)
  : 10

type Fixture = {
  fixture: { id: number; date?: string; status?: { short?: string; long?: string; elapsed?: number | null }; venue?: { name?: string; city?: string } }
  league: { id: number; name?: string; season?: number; round?: string; logo?: string }
  teams: {
    home: { id: number; name: string; logo?: string }
    away: { id: number; name: string; logo?: string }
  }
  goals?: { home?: number | null; away?: number | null }
}

type TeamStatsResponse = {
  response?: Parameters<typeof calculateTeamRating>[0]
}

type RecentFixture = {
  teams?: { home?: { id?: number }; away?: { id?: number } }
  goals?: { home?: number | null; away?: number | null }
}

type RecentFixturesResponse = { response?: RecentFixture[] }

function formPoints(results: string) {
  return results.split("").reduce((total, result) => total + (result === "W" ? 3 : result === "D" ? 1 : 0), 0)
}

function predictFromGap(homeValue: number, awayValue: number, drawThreshold: number, homeTeam: string, awayTeam: string) {
  const gap = homeValue - awayValue
  if (Math.abs(gap) <= drawThreshold) return "DRAW"
  return gap > 0 ? homeTeam : awayTeam
}

async function fetchRecentForm(teamId: number) {
  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5&status=FT`,
      {
        headers: { "x-apisports-key": API_KEY || "" },
        next: { revalidate: 3600 },
      },
    )
    if (!response.ok) return null

    const data = await response.json() as RecentFixturesResponse
    const results = (data.response || []).flatMap((fixture) => {
      const homeGoals = fixture.goals?.home
      const awayGoals = fixture.goals?.away
      if (homeGoals === null || homeGoals === undefined || awayGoals === null || awayGoals === undefined) return []
      if (homeGoals === awayGoals) return ["D"]
      const isHome = fixture.teams?.home?.id === teamId
      const won = isHome ? homeGoals > awayGoals : awayGoals > homeGoals
      return [won ? "W" : "L"]
    }).slice(-5)

    return results.length === 5 ? { sequence: results.join(""), points: formPoints(results.join("")) } : null
  } catch (error) {
    console.warn("RECENT FORM ERROR", { teamId, error })
    return null
  }
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
    const access = await getSubscriptionAccess()
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

    const selectedFixtures = fixtures.slice(0, access.isPro ? MAX_FIXTURES : 2)
    const ratingEntries = await Promise.all(
      selectedFixtures.flatMap((item: Fixture) => [
        fetchTeamRating(item.teams.home.id, item.league.id, item.league.season || new Date().getUTCFullYear()),
        fetchTeamRating(item.teams.away.id, item.league.id, item.league.season || new Date().getUTCFullYear()),
      ])
    )
    const confirmedLineupEntries = await Promise.all(
      selectedFixtures.map((item: Fixture) => fetchConfirmedLineupRatings(item.fixture.id))
    )
    const formEntries = await Promise.all(
      selectedFixtures.flatMap((item: Fixture) => [
        fetchRecentForm(item.teams.home.id),
        fetchRecentForm(item.teams.away.id),
      ])
    )
    const oddsEntries = access.isPro
      ? await Promise.all(selectedFixtures.map((item: Fixture) => fetchMatchOdds(item.fixture.id)))
      : selectedFixtures.map(() => null)

    const matches = await Promise.all(
      selectedFixtures.map(async (item: Fixture, index: number) => {
        const fixtureId = item.fixture.id
        const homeRating = ratingEntries[index * 2] || teamRatings[item.teams.home.name] || 70
        const awayRating = ratingEntries[index * 2 + 1] || teamRatings[item.teams.away.name] || 70
        const confirmedLineups = confirmedLineupEntries[index]
        const lineupStatus = confirmedLineups?.length ? "confirmed" : "awaiting"
        const homeProjectedRating = findProjectedRating(confirmedLineups, item.teams.home.name)
        const awayProjectedRating = findProjectedRating(confirmedLineups, item.teams.away.name)
        const homeLineupTotal = confirmedLineups?.find((lineup: { team: string; total?: number }) => lineup.team === item.teams.home.name)?.total ?? null
        const awayLineupTotal = confirmedLineups?.find((lineup: { team: string; total?: number }) => lineup.team === item.teams.away.name)?.total ?? null
        const historicalSnapshot = getHistoricalRatingSnapshot(fixtureId)
        const homeForm = formEntries[index * 2]
        const awayForm = formEntries[index * 2 + 1]
        const ratingPrediction = homeLineupTotal !== null && awayLineupTotal !== null
          ? predictFromGap(homeLineupTotal, awayLineupTotal, 11, item.teams.home.name, item.teams.away.name)
          : null
        const formPrediction = homeForm && awayForm
          ? predictFromGap(homeForm.points, awayForm.points, 3, item.teams.home.name, item.teams.away.name)
          : null
        const consensusSelection = ratingPrediction && ratingPrediction === formPrediction ? ratingPrediction : null
        const matchOdds = oddsEntries[index]

        const signalHomeRating = homeProjectedRating || homeRating
        const signalAwayRating = awayProjectedRating || awayRating
        const probabilities = calculateMatchProbabilities(signalHomeRating, signalAwayRating)
        const selectedOdds = probabilities.predictedOutcome === "HOME WIN"
          ? matchOdds?.home
          : probabilities.predictedOutcome === "DRAW"
            ? matchOdds?.draw
            : probabilities.predictedOutcome === "AWAY WIN"
            ? matchOdds?.away
            : null
        const impliedProbability = selectedOdds ? 1 / selectedOdds : null
        const valuePercent = impliedProbability
          ? Math.round((probabilities.confidence / 100 - impliedProbability) * 100)
          : null

        // Compare the model's full probability spread against the best odds for every 1X2 outcome, not just the predicted one.
        const outcomeValues = (
          [
            ["HOME WIN", probabilities.home, matchOdds?.home] as const,
            ["DRAW", probabilities.draw, matchOdds?.draw] as const,
            ["AWAY WIN", probabilities.away, matchOdds?.away] as const,
          ]
        ).map(([outcome, modelProbability, odd]) => {
          const implied = odd ? Math.round((1 / odd) * 100) : null
          const value = odd ? Math.round(modelProbability - implied!) : null
          return { outcome, modelProbability, impliedProbability: implied, odd: odd ?? null, value }
        })
        const bestValueEntry = outcomeValues
          .filter((entry) => entry.value !== null)
          .sort((left, right) => (right.value ?? -Infinity) - (left.value ?? -Infinity))[0] || null
        const bestValueMarket = bestValueEntry && bestValueEntry.value !== null && bestValueEntry.value >= 5
          ? { market: "Match Winner", outcome: bestValueEntry.outcome, odd: bestValueEntry.odd, valuePercent: bestValueEntry.value }
          : null

        return {
          accessLevel: access.isPro ? "pro" : "free",
          fixtureId,
          kickoff: item.fixture.date || null,
          status: item.fixture.status?.long || item.fixture.status?.short || "Scheduled",
          statusCode: item.fixture.status?.short || "NS",
          elapsed: item.fixture.status?.elapsed ?? null,
          venue: item.fixture.venue?.name || null,
          leagueLogo: item.league.logo || null,
          leagueId: item.league.id,
          round: item.league.round || null,
          leagueName: item.league.name || "European competition",
          homeTeamId: item.teams.home.id,
          homeTeam: item.teams.home.name,
          homeLogo: item.teams.home.logo || null,
          awayTeamId: item.teams.away.id,
          awayTeam: item.teams.away.name,
          awayLogo: item.teams.away.logo || null,
          homeGoals: item.goals?.home ?? null,
          awayGoals: item.goals?.away ?? null,
          signal: probabilities.predictedOutcome,
          confidence: probabilities.confidence,
          homeProbability: probabilities.home,
          drawProbability: probabilities.draw,
          awayProbability: probabilities.away,
          odds: selectedOdds ? selectedOdds.toFixed(2) : null,
          oddsMarkets: matchOdds?.markets || [],
          valuePercent,
          valueLabel: valuePercent === null
            ? "Unavailable"
            : valuePercent >= 5
              ? "Potential value"
              : valuePercent <= -5
                ? "Potentially overpriced"
                : "Fairly priced",
          outcomeValues,
          bestValueMarket,
          homeRating,
          awayRating,
          homeProjectedRating,
          awayProjectedRating,
          homeLineupTotal,
          awayLineupTotal,
          projectedLineups: confirmedLineups,
          lineupStatus,
          hasLineups: Boolean(confirmedLineups?.length),
          ratingSource: historicalSnapshot?.sourceLabel || null,
          ratingSourceUrl: historicalSnapshot?.sourceUrl || null,
          ratingCapturedAt: historicalSnapshot?.capturedAt || null,
          homeForm: homeForm?.sequence || null,
          homeFormPoints: homeForm?.points ?? null,
          awayForm: awayForm?.sequence || null,
          awayFormPoints: awayForm?.points ?? null,
          ratingPrediction,
          formPrediction,
          consensusSelection,
          combinedLineupTotals: null,
        }
      })
    )

    if (supabase && access.isPro && matches.length > 0) {
      const predictionRows = matches.map((match) => ({
        ...(() => {
          const fixture = selectedFixtures.find((item: Fixture) => item.fixture.id === match.fixtureId)
          const isFinished = ["FT", "AET", "PEN"].includes(fixture?.fixture.status?.short || "")
          const hasScore = fixture?.goals?.home !== null && fixture?.goals?.home !== undefined
            && fixture.goals.away !== null && fixture.goals.away !== undefined
          return {
            actual_home_goals: hasScore ? fixture?.goals?.home : null,
            actual_away_goals: hasScore ? fixture?.goals?.away : null,
            outcome_status: isFinished && hasScore ? "settled" : "pending",
            settled_at: isFinished && hasScore ? new Date().toISOString() : null,
          }
        })(),
        fixture_id: match.fixtureId,
        fixture_date: match.kickoff,
        league_id: match.leagueId,
        home_team_id: match.homeTeamId,
        home_team: match.homeTeam,
        away_team_id: match.awayTeamId,
        away_team: match.awayTeam,
        home_rating: match.homeRating,
        away_rating: match.awayRating,
        home_projected_rating: match.homeProjectedRating,
        away_projected_rating: match.awayProjectedRating,
        home_probability: match.homeProbability,
        draw_probability: match.drawProbability,
        away_probability: match.awayProbability,
        predicted_outcome: match.signal,
        confidence: match.confidence,
        bookmaker_odds: match.odds ? Number(match.odds) : null,
        value_percent: match.valuePercent,
      }))

      const { error: predictionError } = await supabase
        .from("prediction_snapshots")
        .upsert(predictionRows, { onConflict: "fixture_id" })

      if (predictionError) {
        console.warn("Prediction snapshot unavailable", predictionError.message)
      }
    }

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

async function fetchConfirmedLineupRatings(fixtureId: number) {
  try {
    const historicalSnapshot = getHistoricalRatingSnapshot(fixtureId)
    if (historicalSnapshot) return historicalSnapshot.lineups

    const lineups = await fetchLineups(fixtureId)
    const confirmedLineups = lineups.filter((lineup) => !lineup.isProjected && (lineup.startXI?.length || 0) >= 11)
    const ratings = (confirmedLineups as ApiLineup[]).map((lineup) => {
      const lineupRating = calculateLineupRating(lineup.startXI || [])
      return {
        team: lineup.team?.name || "Team",
        rating: lineupRating.average,
        total: lineupRating.total,
        formation: lineup.formation || null,
        isProjected: Boolean(lineup.isProjected),
        players: (lineup.startXI || []).map((player) => ({
          name: player.player?.name || player.name || "Unknown player",
          photo: player.player?.photo || null,
          position: player.position || player.player?.pos || player.player?.position || "MID",
          grid: player.player?.grid || null,
          number: player.player?.number ?? null,
          rating: calculateLineupRating([player]).players[0]?.rating || null,
        })),
      }
    })

    return ratings.length > 0 ? ratings : null
  } catch (error) {
    console.error("CONFIRMED LINEUP RATING ERROR", { fixtureId, error })
    return null
  }
}