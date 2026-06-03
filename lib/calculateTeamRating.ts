export function calculateTeamRating(stats: any): number {
  if (!stats?.fixtures || !stats?.goals) {
    return 70
  }

  const wins = stats.fixtures?.wins?.total ?? 0
  const draws = stats.fixtures?.draws?.total ?? 0
  const losses = stats.fixtures?.loses?.total ?? 0

  const goalsFor = stats.goals?.for?.total?.total ?? 0
  const goalsAgainst = stats.goals?.against?.total?.total ?? 0

  const games = wins + draws + losses

  if (games === 0) {
    return 70
  }

  const winRate = wins / games
  const pointsPerGame = (wins * 3 + draws) / games
  const goalDifference = goalsFor - goalsAgainst

  let rating = 60

  rating += winRate * 15
  rating += pointsPerGame * 6
  rating += goalDifference * 0.25
  rating += (goalsFor / games) * 3
  rating -= (goalsAgainst / games) * 2

  return Math.round(Math.max(50, Math.min(95, rating)))
}
