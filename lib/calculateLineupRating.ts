import { playerRatings } from "./playerRatings"

export function calculateLineupRating(players: any[]) {
  if (!players || players.length === 0) {
    return {
      average: 70,
      players: [],
    }
  }

  let total = 0

  const playerBreakdown = players.map((item) => {
    const name =
      item.player?.name ||
      item.name ||
      "Unknown Player"

    // Fallback rating for players not in database
    const fallbackRating =
      68 + (name.length % 10)

    const rating =
      playerRatings[name] || fallbackRating

    total += rating

    return {
      name,
      rating,
    }
  })

  return {
    average: Math.round(total / players.length),
    players: playerBreakdown,
  }
}
