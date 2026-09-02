import { getPlayerRating } from "./playerRatings"
import type { LineupPlayer } from "./lineupUtils"

export function calculateTeamRating(players: LineupPlayer[]) {
  let total = 0
  let counted = 0

  for (const p of players) {
    const name = p.player?.name || p.name

    if (!name) continue

    const rating = getPlayerRating(name, {
      position: p.position || p.player?.position || "MID",
      form: 72 + (name.length % 18),
      minutes: p.starts ? 1800 : 450,
      isStarter: p.starts ?? true,
    })

    total += rating
    counted++
  }

  if (counted === 0) {
    return 60
  }

  return Math.round(total / counted)
}
