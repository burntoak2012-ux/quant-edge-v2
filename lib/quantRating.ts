export type QuantPlayerInput = {
  baseRating?: number
  position?: string
  form?: number
  minutes?: number
  appearances?: number
  goals?: number
  assists?: number
  tackles?: number
  interceptions?: number
  performanceRating?: number
  isStarter?: boolean
  recentPerformances?: RecentPlayerPerformance[]
}

export type RecentPlayerPerformance = {
  position?: string
  providerRating?: number
  minutes?: number
  goals?: number
  assists?: number
  tackles?: number
  interceptions?: number
  keyPasses?: number
  shotsOnTarget?: number
  cleanSheet?: boolean
  goalImpacts?: GoalImpact[]
}

export type GoalImpact = {
  minute?: number
  scoreBefore?: { home: number; away: number }
  team?: "home" | "away"
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const positionScore = (position?: string) => {
  const normalized = (position || "MID").toUpperCase()
  if (normalized.includes("GK")) return 74
  if (normalized.includes("DEF")) return 76
  if (normalized.includes("FWD") || normalized.includes("ATT")) return 80
  return 78
}

function weightedGoalImpact(goals: GoalImpact[] = []) {
  return goals.reduce((total, goal) => {
    const minute = goal.minute || 45
    const scoreBefore = goal.scoreBefore
    const wasLevel = scoreBefore ? scoreBefore.home === scoreBefore.away : false
    const wasBehind = scoreBefore && goal.team
      ? goal.team === "home" ? scoreBefore.home < scoreBefore.away : scoreBefore.away < scoreBefore.home
      : false
    const wasLate = minute >= 75
    return total + 1 + (wasBehind ? 0.8 : 0) + (wasLevel ? 0.35 : 0) + (wasLate ? 0.25 : 0)
  }, 0)
}

function recentPerformanceScore(performances: RecentPlayerPerformance[] = []) {
  if (!performances.length) return null

  let weightedTotal = 0
  let weightTotal = 0
  performances.slice(0, 8).forEach((performance, index) => {
    const weight = Math.pow(0.82, index)
    const providerRating = performance.providerRating ? performance.providerRating * 10 : 70
    const minutes = Math.max(0, performance.minutes || 0)
    const position = (performance.position || "MID").toUpperCase()
    const defensiveWork = (performance.tackles || 0) * (position.includes("DEF") ? 1.5 : 1.0) + (performance.interceptions || 0) * (position.includes("DEF") ? 1.7 : 1.1)
    const creativeWork = (performance.keyPasses || 0) * (position.includes("MID") ? 1.15 : 0.85)
    const finishingWork = (performance.shotsOnTarget || 0) * (position.includes("FWD") || position.includes("ATT") ? 1.1 : 0.75)
    const workRate = Math.min(8, defensiveWork + creativeWork + finishingWork)
    const weightedGoals = weightedGoalImpact(performance.goalImpacts)
    const contributions = Math.min(10, (performance.assists || 0) * 2.5 + weightedGoals * 2.4)
    const availability = minutes >= 60 ? 2 : minutes > 0 ? 0.5 : -3
    const matchScore = clamp(providerRating + workRate + contributions + availability + (performance.cleanSheet ? 1.5 : 0), 45, 99)
    weightedTotal += matchScore * weight
    weightTotal += weight
  })

  return weightTotal ? weightedTotal / weightTotal : null
}

export function calculateQuantPlayerRating(input: QuantPlayerInput = {}) {
  const baseRating = clamp(input.baseRating ?? 72, 55, 95)
  const form = clamp(input.form ?? baseRating, 55, 95)
  const minutes = Math.max(0, input.minutes ?? 0)
  const appearances = Math.max(0, input.appearances ?? 0)
  const starts = input.isStarter === true ? 1 : input.isStarter === false ? 0 : 0.5
  const availability = clamp(
    appearances > 0 ? (minutes / Math.max(appearances * 90, 90)) * 8 : starts * 4,
    0,
    8,
  )
  const recentScore = recentPerformanceScore(input.recentPerformances)
  const goalContributions = Math.max(0, (input.goals ?? 0) + (input.assists ?? 0))
  const defensiveActions = Math.max(0, (input.tackles ?? 0) + (input.interceptions ?? 0))
  const contributionRate = minutes > 0 ? (goalContributions * 90) / minutes : 0
  const defensiveRate = minutes > 0 ? (defensiveActions * 90) / minutes : 0
  const weightedSeasonGoals = Math.min(12, goalContributions * 1.5)
  const production = clamp(50 + weightedSeasonGoals + contributionRate * 12 + defensiveRate * 6, 50, 95)
  const recentPerformance = clamp(input.performanceRating ?? form, 55, 99)
  const role = positionScore(input.position)

  const rating =
    baseRating * 0.28 +
    form * 0.12 +
    recentPerformance * 0.12 +
    (recentScore ?? recentPerformance) * 0.28 +
    role * 0.10 +
    production * 0.10 +
    availability * 0.5 +
    starts * 2

  return clamp(Math.round(rating), 60, 99)
}

type QuantTeamInput = {
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  cleanSheets?: number
  form?: string
}

function formScore(form?: string) {
  if (!form) return 0
  const results = form.toUpperCase().split("").filter((result) => "WDL".includes(result)).slice(-5)
  if (results.length === 0) return 0
  const points = results.reduce((total, result) => total + (result === "W" ? 1 : result === "D" ? 0 : -1), 0)
  return (points / results.length) * 4
}

export function calculateQuantTeamRating(input: QuantTeamInput) {
  const games = input.wins + input.draws + input.losses
  if (games < 5) return 70

  const winRate = input.wins / games
  const pointsPerGame = (input.wins * 3 + input.draws) / games
  const goalsForPerGame = input.goalsFor / games
  const goalsAgainstPerGame = input.goalsAgainst / games
  const goalDifferencePerGame = (input.goalsFor - input.goalsAgainst) / games
  const cleanSheetRate = clamp((input.cleanSheets ?? 0) / games, 0, 1)

  const rating =
    48 +
    (pointsPerGame / 3) * 24 +
    winRate * 8 +
    clamp(goalDifferencePerGame, -2, 2) * 6 +
    clamp(goalsForPerGame, 0, 4) * 3 -
    clamp(goalsAgainstPerGame, 0, 4) * 2 +
    cleanSheetRate * 5 +
    formScore(input.form)

  return clamp(Math.round(rating), 52, 95)
}
