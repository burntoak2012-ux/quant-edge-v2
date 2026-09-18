import test from "node:test"
import assert from "node:assert/strict"

import { calculateLineupRating } from "../lib/calculateLineupRating"
import { calculateTeamRating } from "../lib/calculateTeamRating"
import { getPlayerRating } from "../lib/playerRatings"
import { calculateQuantPlayerRating, calculateQuantTeamRating } from "../lib/quantRating"
import { calculateMatchProbabilities } from "../lib/matchProbability"

test("player rating should use a weighted internal form instead of raw static values", () => {
  const elite = getPlayerRating("Kylian Mbappe", { position: "FWD", isStarter: true, form: 86, minutes: 2200 })
  const bench = getPlayerRating("Reserve Player", { position: "MID", isStarter: false, form: 60, minutes: 300 })

  assert.ok(elite > bench)
  assert.ok(elite >= 78)
  assert.ok(bench < 75)
})

test("team rating should reward stronger recent form and goal difference", () => {
  const strong = calculateTeamRating({
    fixtures: { wins: { total: 12 }, draws: { total: 2 }, loses: { total: 4 } },
    goals: { for: { total: { total: 31 } }, against: { total: { total: 17 } } },
  })

  const weak = calculateTeamRating({
    fixtures: { wins: { total: 5 }, draws: { total: 5 }, loses: { total: 8 } },
    goals: { for: { total: { total: 18 } }, against: { total: { total: 28 } } },
  })

  assert.ok(strong > weak)
  assert.ok(strong >= 72)
  assert.ok(weak < 70)
})

test("quant team rating should reward clean sheets and recent form", () => {
  const inForm = calculateQuantTeamRating({
    wins: 10,
    draws: 2,
    losses: 2,
    goalsFor: 28,
    goalsAgainst: 9,
    cleanSheets: 8,
    form: "WWDWW",
  })
  const fading = calculateQuantTeamRating({
    wins: 10,
    draws: 2,
    losses: 2,
    goalsFor: 28,
    goalsAgainst: 9,
    cleanSheets: 2,
    form: "LLDWL",
  })

  assert.ok(inForm > fading)
})

test("quant player rating should not invent form from a player's name", () => {
  const sameProfile = {
    baseRating: 78,
    position: "MID",
    form: 78,
    minutes: 1800,
    appearances: 20,
    isStarter: true,
  } as const

  assert.equal(
    calculateQuantPlayerRating(sameProfile),
    calculateQuantPlayerRating({ ...sameProfile }),
  )
})

test("quant player rating stays within the 60 to 99 product scale", () => {
  assert.ok(calculateQuantPlayerRating({ baseRating: 99, form: 99, performanceRating: 99, minutes: 3000, appearances: 35, isStarter: true }) <= 99)
  assert.ok(calculateQuantPlayerRating({ baseRating: 55, form: 55, performanceRating: 55, minutes: 0, appearances: 0, isStarter: false }) >= 60)
})

test("quant player rating prioritizes recent match performance", () => {
  const recentForm = calculateQuantPlayerRating({
    baseRating: 78,
    position: "MID",
    form: 72,
    performanceRating: 72,
    recentPerformances: [
      { providerRating: 8.6, minutes: 90, tackles: 4, interceptions: 2, keyPasses: 3 },
      { providerRating: 8.2, minutes: 87, tackles: 3, keyPasses: 2 },
    ],
  })
  const poorRecentForm = calculateQuantPlayerRating({
    baseRating: 78,
    position: "MID",
    form: 72,
    performanceRating: 72,
    recentPerformances: [
      { providerRating: 5.9, minutes: 90, tackles: 0, interceptions: 0, keyPasses: 0 },
      { providerRating: 6.1, minutes: 30 },
    ],
  })

  assert.ok(recentForm > poorRecentForm)
})

test("goal impact is weighted by match state and timing", () => {
  const decisiveGoal = calculateQuantPlayerRating({
    baseRating: 78,
    recentPerformances: [{ providerRating: 7, minutes: 90, goals: 1, goalImpacts: [{ minute: 82, team: "home", scoreBefore: { home: 0, away: 0 } }] }],
  })
  const routineGoal = calculateQuantPlayerRating({
    baseRating: 78,
    recentPerformances: [{ providerRating: 7, minutes: 90, goals: 1, goalImpacts: [{ minute: 18, team: "home", scoreBefore: { home: 3, away: 0 } }] }],
  })

  assert.ok(decisiveGoal > routineGoal)
})

test("recent actions are interpreted in the player's role", () => {
  const defender = calculateQuantPlayerRating({
    baseRating: 75,
    recentPerformances: [{ position: "DEF", providerRating: 7, minutes: 90, tackles: 5, interceptions: 3 }],
  })
  const forward = calculateQuantPlayerRating({
    baseRating: 75,
    recentPerformances: [{ position: "FWD", providerRating: 7, minutes: 90, tackles: 5, interceptions: 3 }],
  })

  assert.ok(defender > forward)
})

test("match probabilities are normalized and reward home advantage", () => {
  const probabilities = calculateMatchProbabilities(80, 80)
  const total = probabilities.home + probabilities.draw + probabilities.away

  assert.ok(total >= 99 && total <= 101)
  assert.ok(probabilities.home > probabilities.away)
  assert.ok(probabilities.confidence >= probabilities.home)
})

test("lineup rating should reward starters and stronger role balance", () => {
  const eliteLineup = calculateLineupRating([
    { player: { name: "Kylian Mbappe" }, position: "FWD", starts: true },
    { player: { name: "Rodri" }, position: "MID", starts: true },
    { player: { name: "Virgil van Dijk" }, position: "DEF", starts: true },
    { player: { name: "Ederson" }, position: "GK", starts: true },
  ])

  const weakLineup = calculateLineupRating([
    { player: { name: "Reserve Player" }, position: "FWD", starts: false },
    { player: { name: "Backup Mid" }, position: "MID", starts: false },
    { player: { name: "Backup Defender" }, position: "DEF", starts: false },
    { player: { name: "Backup GK" }, position: "GK", starts: false },
  ])

  assert.ok(eliteLineup.average > weakLineup.average)
  assert.ok(eliteLineup.average >= 78)
})
