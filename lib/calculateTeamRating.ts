type TeamStats = {
  team?: { name?: string }
  fixtures?: {
    wins?: { total?: number; home?: number; away?: number }
    draws?: { total?: number; home?: number; away?: number }
    loses?: { total?: number; home?: number; away?: number }
    losses?: { total?: number; home?: number; away?: number }
  }
  goals?: {
    for?: { total?: { total?: number; home?: number; away?: number } }
    against?: { total?: { total?: number; home?: number; away?: number } }
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export function calculateTeamRating(stats: TeamStats): number {
  if (!stats?.fixtures || !stats?.goals) {
    return 70
  }

  const wins =
    stats.fixtures?.wins?.total ??
    ((stats.fixtures?.wins?.home ?? 0) + (stats.fixtures?.wins?.away ?? 0))

  const draws =
    stats.fixtures?.draws?.total ??
    ((stats.fixtures?.draws?.home ?? 0) + (stats.fixtures?.draws?.away ?? 0))

  const losses =
    stats.fixtures?.loses?.total ??
    stats.fixtures?.losses?.total ??
    ((stats.fixtures?.loses?.home ?? 0) +
      (stats.fixtures?.loses?.away ?? 0) +
      (stats.fixtures?.losses?.home ?? 0) +
      (stats.fixtures?.losses?.away ?? 0))

  const goalsFor =
    stats.goals?.for?.total?.total ??
    ((stats.goals?.for?.total?.home ?? 0) +
      (stats.goals?.for?.total?.away ?? 0))

  const goalsAgainst =
    stats.goals?.against?.total?.total ??
    ((stats.goals?.against?.total?.home ?? 0) +
      (stats.goals?.against?.total?.away ?? 0))

  const games = wins + draws + losses

  if (games < 5) {
    return 70
  }

  const winRate = wins / games
  const pointsPerGame = (wins * 3 + draws) / games
  const goalDifference = goalsFor - goalsAgainst
  const goalsForPerGame = goalsFor / games
  const goalsAgainstPerGame = goalsAgainst / games

  const rating =
    58 +
    winRate * 18 +
    pointsPerGame * 7 +
    goalDifference * 0.18 +
    goalsForPerGame * 4 -
    goalsAgainstPerGame * 2.5

  return clamp(Math.round(rating), 52, 95)
}
