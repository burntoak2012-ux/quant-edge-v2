import { getPlayerRating } from "./playerRatings"

export type LineupPlayer = {
  player?: { name?: string; position?: string; pos?: string; photo?: string; grid?: string; number?: number }
  name?: string
  position?: string
  starts?: boolean
  soccerWikiRating?: number
}

export type ApiLineup = {
  team?: { name?: string }
  formation?: string
  startXI?: LineupPlayer[]
  isProjected?: boolean
}

export async function computeTeamTotals(players: LineupPlayer[]) {
  if (!players || players.length === 0) {
    return {
      total: 0,
      average: 70,
      players: [],
    }
  }

  const resolved = players.map((item) => {
    const name = item.player?.name || item.name || "Unknown Player"
    const position = item.position || item.player?.position || item.player?.pos || "MID"
    const isStarter = item.starts ?? true
    const rating = getPlayerRating(name, {
      position,
      performanceRating: typeof item.soccerWikiRating === "number" ? item.soccerWikiRating : undefined,
      form: typeof item.soccerWikiRating === "number" ? item.soccerWikiRating : undefined,
      minutes: isStarter ? 1800 : 450,
      isStarter,
    })

    return { name, position, rating }
  })

  const total = resolved.reduce((sum, item) => sum + item.rating, 0)

  return {
    total,
    average: Math.round(total / players.length),
    players: resolved,
  }
}

export async function computeCombinedLineupTotals(lineups: ApiLineup[]) {
  const results = await Promise.all(
    (lineups || []).map(async (lu: ApiLineup) => {
      const players = lu.startXI || []
      const teamName = lu.team?.name || "Team"
      const t = await computeTeamTotals(players)
      return {
        team: teamName,
        total: t.total,
        average: t.average,
        players: t.players,
      }
    })
  )

  const combined = results.reduce((acc, cur) => acc + (cur.total || 0), 0)

  return {
    teams: results,
    combinedTotal: combined,
  }
}
