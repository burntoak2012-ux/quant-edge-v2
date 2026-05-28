import { playerRatings } from "./playerRatings"

export function calculateTeamRating(players: any[]) {
  let total = 0
  let counted = 0

  for (const p of players) {
    const name = p.player?.name

    if (!name) continue

    const rating = playerRatings[name]

    if (rating) {
      total += rating
      counted++
    }
  }

  if (counted === 0) {
    return 60
  }

  return Math.round(total / counted)
}
