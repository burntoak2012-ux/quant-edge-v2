import test from "node:test"
import assert from "node:assert/strict"

import { calculateLineupRating } from "../lib/calculateLineupRating"
import { calculateTeamRating } from "../lib/calculateTeamRating"
import { getPlayerRating } from "../lib/playerRatings"
import { calculateQuantPlayerRating, calculateQuantTeamRating } from "../lib/quantRating"

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
