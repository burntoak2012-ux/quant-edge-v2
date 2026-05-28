import { calculateTeamRating } from "./ratingModel"

export function generateSignalFromLineups(
  homeLineup: any[],
  awayLineup: any[]
) {
  const homeRating = calculateTeamRating(homeLineup)
  const awayRating = calculateTeamRating(awayLineup)

  const difference = homeRating - awayRating

  const confidence = Math.min(
    Math.max(50 + difference * 3, 5),
    95
  )

  let signal = "AVOID"

  if (confidence >= 80) {
    signal = "STRONG BUY"
  } else if (confidence >= 70) {
    signal = "BUY"
  } else if (confidence >= 60) {
    signal = "WATCH"
  }

  return {
    signal,
    confidence: `${confidence}%`,
    odds: (100 / confidence).toFixed(2),
    homeRating,
    awayRating,
  }
}