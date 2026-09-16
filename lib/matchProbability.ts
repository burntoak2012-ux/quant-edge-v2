export type MatchProbabilities = {
  home: number
  draw: number
  away: number
  predictedOutcome: "HOME WIN" | "DRAW" | "AWAY WIN" | "PASS"
  confidence: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/** Converts rating strength into an explicit, normalized 1X2 estimate. */
export function calculateMatchProbabilities(
  homeRating: number,
  awayRating: number,
  homeAdvantage = 3.5,
): MatchProbabilities {
  const adjustedDifference = homeRating + homeAdvantage - awayRating
  const winShare = 1 / (1 + Math.exp(-adjustedDifference / 12))
  const drawProbability = clamp(0.29 - Math.abs(adjustedDifference) * 0.006, 0.16, 0.29)
  const homeProbability = (1 - drawProbability) * winShare
  const awayProbability = (1 - drawProbability) * (1 - winShare)
  const probabilities = [homeProbability, drawProbability, awayProbability]
  const highest = Math.max(...probabilities)
  const confidence = Math.round(highest * 100)
  const margin = highest - probabilities.sort((a, b) => b - a)[1]

  return {
    home: Math.round(homeProbability * 100),
    draw: Math.round(drawProbability * 100),
    away: Math.round(awayProbability * 100),
    predictedOutcome: margin < 0.06 ? "PASS" : highest === homeProbability ? "HOME WIN" : highest === awayProbability ? "AWAY WIN" : "DRAW",
    confidence,
  }
}
