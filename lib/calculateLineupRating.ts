import { getPlayerRating } from "./playerRatings"
import type { LineupPlayer } from "./lineupUtils"

export function calculateLineupRating(players: LineupPlayer[]) {
  if (!players || players.length === 0) {
    return {
      average: 70,
      total: 0,
      players: [],
    }
  }

  let total = 0

  const playerBreakdown = players.map((item) => {
    const name = item.player?.name || item.name || "Unknown Player"
    const position = item.position || item.player?.position || item.player?.pos || "MID"
    const isStarter = item.starts ?? true
    const rating = getPlayerRating(name, {
      position,
      performanceRating: typeof item.soccerWikiRating === "number" ? item.soccerWikiRating : undefined,
      minutes: isStarter ? 1800 : 450,
      isStarter,
    })

    total += rating

    return {
      name,
      position,
      rating,
    }
  })

  return {
    average: Math.round(total / players.length),
    total: Math.round(total),
    players: playerBreakdown,
  }
}
