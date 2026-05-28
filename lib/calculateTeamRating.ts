import type { Player } from "./ratingModel"

export function calculateTeamRating(players: Player[]) {
  const starters = players.filter((p) => p.starts)

  const total = starters.reduce((sum, player) => {
    return sum + player.soccerWikiRating
  }, 0)

  return Math.round(total / starters.length)
}
