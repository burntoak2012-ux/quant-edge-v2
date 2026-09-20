const API_KEY = process.env.API_FOOTBALL_KEY

import { fetchFlashscoreLineups } from "./fetchFlashscore"
import type { ApiLineup } from "./lineupUtils"

type SquadListResponse = {
  response?: Array<{
    players?: Array<{ name?: string; photo?: string; position?: string; number?: number }>
  }>
}

type AppearanceResponse = {
  response?: Array<{
    player?: { name?: string }
    statistics?: Array<{ games?: { appearances?: number; appearences?: number; lineups?: number; minutes?: number } }>
  }>
}

type RosterPlayer = { name: string; photo?: string; position: string; number?: number }

const POSITION_BUCKETS = [
  { key: "GK", count: 1, match: ["goal", "gk"] },
  { key: "DEF", count: 4, match: ["def", "back"] },
  { key: "MID", count: 3, match: ["mid"] },
  { key: "FWD", count: 3, match: ["att", "for", "strik", "wing"] },
]

function bucketFor(position: string) {
  const value = position.toLowerCase()
  return POSITION_BUCKETS.find((bucket) => bucket.match.some((token) => value.includes(token))) || POSITION_BUCKETS[2]
}

function buildRosterProjection(
  teamName: string,
  roster: RosterPlayer[],
  weights: Map<string, { lineups: number; minutes: number }>,
) {
  const ranked = roster
    .filter((player) => Boolean(player.name))
    .map((player) => ({ player, weight: weights.get(player.name.toLowerCase()) }))
    .sort((left, right) => {
      const leftWeight = left.weight?.lineups ?? -1
      const rightWeight = right.weight?.lineups ?? -1
      if (leftWeight !== rightWeight) return rightWeight - leftWeight
      return (right.weight?.minutes || 0) - (left.weight?.minutes || 0)
    })

  const used = new Set<typeof ranked[number]>()
  const selection: typeof ranked = []
  for (const bucket of POSITION_BUCKETS) {
    const matches = ranked.filter((entry) => !used.has(entry) && bucketFor(entry.player.position).key === bucket.key)
    for (const entry of matches.slice(0, bucket.count)) {
      used.add(entry)
      selection.push(entry)
    }
  }
  for (const entry of ranked) {
    if (selection.length >= 11) break
    if (!used.has(entry)) {
      used.add(entry)
      selection.push(entry)
    }
  }

  if (selection.length < 11) return null

  return {
    team: { name: teamName },
    formation: "4-3-3",
    isProjected: true,
    startXI: selection.map(({ player }, index) => ({
      player: {
        name: player.name,
        photo: player.photo,
        pos: player.position,
        number: player.number,
        grid: index === 0 ? "1:1" : index <= 4 ? `2:${index}` : index <= 7 ? `3:${index - 4}` : `4:${index - 7}`,
      },
      position: player.position || "MID",
    })),
  }
}

async function fetchSquadRoster(teamId: number): Promise<RosterPlayer[] | null> {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, {
      headers: { "x-apisports-key": API_KEY || "" },
      next: { revalidate: 21600 },
    })
    if (!response.ok) return null

    const data = await response.json() as SquadListResponse
    const players = data.response?.[0]?.players || []
    const roster = players
      .filter((player) => Boolean(player.name))
      .map((player) => ({ name: player.name as string, photo: player.photo, position: player.position || "MID", number: player.number }))

    return roster.length >= 11 ? roster : null
  } catch (error) {
    console.warn("Squad roster fetch failed", { teamId, error })
    return null
  }
}

async function fetchAppearanceWeights(teamId: number, season: number) {
  const weights = new Map<string, { lineups: number; minutes: number }>()
  try {
    const response = await fetch(`https://v3.football.api-sports.io/players?team=${teamId}&season=${season}`, {
      headers: { "x-apisports-key": API_KEY || "" },
      next: { revalidate: 21600 },
    })
    if (!response.ok) return weights

    const data = await response.json() as AppearanceResponse
    for (const entry of data.response || []) {
      const name = entry.player?.name
      const games = entry.statistics?.[0]?.games
      if (!name || !games) continue
      weights.set(name.toLowerCase(), { lineups: games.lineups || 0, minutes: games.minutes || 0 })
    }
  } catch (error) {
    console.warn("Appearance weights fetch failed", { teamId, season, error })
  }
  return weights
}

async function fetchSquadProjection(teamId: number, teamName: string, season: number) {
  const [roster, weights] = await Promise.all([
    fetchSquadRoster(teamId),
    fetchAppearanceWeights(teamId, season),
  ])
  if (!roster) return null

  return buildRosterProjection(teamName, roster, weights)
}

export async function fetchLineups(fixtureId: number, opts?: { home?: string; away?: string; homeTeamId?: number; awayTeamId?: number; season?: number; date?: string }): Promise<ApiLineup[]> {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
      {
        headers: {
          "x-apisports-key": API_KEY || "",
        },
        next: { revalidate: 900 },
      }
    )

    const data = await res.json()

    if (data.errors?.rateLimit) console.log("LINEUP RATE LIMITED")

    console.log("Lineups API Response:", data)
    const resp = (data.response || []) as ApiLineup[]
    const hasStartingPlayers = resp.some((lineup) => (lineup.startXI?.length || 0) >= 7)

    if (hasStartingPlayers) return resp

    if (opts?.home && opts?.away) {
      console.log("No lineups from API, trying Flashscore fallback")
      const fs = await fetchFlashscoreLineups(opts.home, opts.away)
      if (fs && fs.length > 0) return fs.map((lineup) => ({ ...lineup, isProjected: true })) as ApiLineup[]
    }

    if (opts?.homeTeamId && opts.awayTeamId && opts.home && opts.away) {
      console.log("No confirmed lineups, building squad-based projected XIs")
      const [homeProjection, awayProjection] = await Promise.all([
        fetchSquadProjection(opts.homeTeamId, opts.home, opts.season || new Date().getUTCFullYear()),
        fetchSquadProjection(opts.awayTeamId, opts.away, opts.season || new Date().getUTCFullYear()),
      ])
      return [homeProjection, awayProjection].filter(Boolean) as ApiLineup[]
    }

    return resp
  } catch (error) {
    console.error("Lineups fetch error:", error)
    return []
  }
}
