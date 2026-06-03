export function generateSignal(
  homeRating: number,
  awayRating: number
) {
  const difference = homeRating - awayRating
  const absDifference = Math.abs(difference)

  // Ignore tiny edges
  if (absDifference < 2) {
    return {
      signal: "PASS",
      confidence: 50,
    }
  }

  // Confidence based on rating gap
  const confidence = Math.min(
    95,
    Math.round(55 + absDifference * 5)
  )

  if (difference > 0) {
    return {
      signal: "HOME WIN",
      confidence,
    }
  }

  return {
    signal: "AWAY WIN",
    confidence,
  }
}