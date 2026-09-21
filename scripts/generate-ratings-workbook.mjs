import ExcelJS from "exceljs"
import { execFile } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const DATE = process.env.RATINGS_DATE || "2026-09-20"
const OUTPUT_DIR = path.join(process.cwd(), "reports")
const OUTPUT_PATH = path.join(OUTPUT_DIR, process.env.RATINGS_OUTPUT || `top-5-leagues-ratings-${DATE}.xlsx`)
const CACHE_PATH = path.join(OUTPUT_DIR, `.ratings-cache-${DATE}.json`)
const API_URL = "https://v3.football.api-sports.io"
const TOP_FIVE_LEAGUES = new Set([39, 140, 78, 135, 61])
const MAX_LINEUP_REQUESTS = Number(process.env.MAX_LINEUP_REQUESTS || 8)
const DRAW_THRESHOLD = 11
const FORM_DRAW_THRESHOLD = 3
const execFileAsync = promisify(execFile)
const ESPN_LEAGUES = [
  { code: "eng.1", id: 39, name: "Premier League" },
  { code: "esp.1", id: 140, name: "La Liga" },
  { code: "ger.1", id: 78, name: "Bundesliga" },
  { code: "ita.1", id: 135, name: "Serie A" },
  { code: "fra.1", id: 61, name: "Ligue 1" },
]
const PLAYER_ALIASES = new Map([
  ["brugui", "roger brugue"],
  ["d dakonam", "dakonam djene"],
  ["x mandza tsiendi", "xavier mandza"],
])
const PLAYER_RATING_OVERRIDES = new Map([
  ["aaron mayol", { name: "Aaron Mayol", position: "M(C)", rating: 65 }],
  ["fatawu issahaku", { name: "Abdul Fatawu", position: "AM,F(RL)", rating: 85 }],
  ["jair paula", { name: "Jair Cunha", position: "D(RC)", rating: 85 }],
  ["jay da silva", { name: "Jay Dasilva", position: "D,DM,M(L)", rating: 84 }],
  ["johaneko louis jean", { name: "Johaneko Louis-Jean", position: "D,DM(RL)", rating: 75 }],
  ["luken beitia", { name: "Luken Beitia", position: "D(C)", rating: 78 }],
  ["noah donkor", { name: "Noah Donkor", position: "D,DM,M(R)", rating: 70 }],
  ["unai santos", { name: "Unai Santos", position: "D(RC)", rating: 70 }],
])
const TEAM_ALIASES = new Map([
  ["angers", { clubId: "310", target: "Angers SCO" }],
  ["deportivo la coruna", { query: "Deportivo", target: "RC Deportivo" }],
  ["fc cologne", { clubId: "385", target: "1. FC Koln" }],
  ["hamburg sv", { clubId: "401", target: "Hamburger SV" }],
  ["lyon", { clubId: "329", target: "Olympique Lyonnais" }],
  ["marseille", { clubId: "330", target: "Olympique Marseille" }],
  ["paris saint germain", { clubId: "338", target: "Paris Saint-Germain" }],
  ["racing santander", { clubId: "161", target: "Real Racing Club" }],
])

function loadEnv(text) {
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#][^=]*)=(.*)$/)
    if (!match || process.env[match[1].trim()]) continue
    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "")
  }
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đð]/g, "d")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function comparableTeamName(value) {
  return normalize(value)
    .split(" ")
    .filter((part) => !["afc", "bc", "calcio", "fc", "ssc", "cf", "1907", "1913"].includes(part))
    .join(" ")
}

function parseClubSearch(html, teamName) {
  const target = comparableTeamName(teamName)
  const candidates = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((rowMatch) => {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => textContent(cell[1]))
    const clubId = rowMatch[1].match(/squad\.php\?clubid=(\d+)/i)?.[1]
    if (!clubId || cells.length > 5) return []
    const name = cells
      .filter(Boolean)
      .find((cell) => comparableTeamName(cell).includes(target) || target.includes(comparableTeamName(cell)))
    return name ? [{ clubId, name, normalized: comparableTeamName(name) }] : []
  })

  return candidates.sort((left, right) => {
    const leftExact = left.normalized === target ? 1 : 0
    const rightExact = right.normalized === target ? 1 : 0
    return rightExact - leftExact || left.normalized.length - right.normalized.length
  })[0] || null
}

async function readCache() {
  try {
    const cache = JSON.parse(await readFile(CACHE_PATH, "utf8"))
    return { fixtures: [], lineups: {}, squads: {}, forms: {}, ...cache }
  } catch {
    return { fixtures: [], lineups: {}, squads: {}, forms: {} }
  }
}

async function saveCache(cache) {
  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8")
}

async function fetchJson(url, apiKey) {
  const response = await fetch(url, { headers: { "x-apisports-key": apiKey } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const data = await response.json()
  if (data.errors && Object.keys(data.errors).length) {
    throw new Error(Object.values(data.errors).join(", "))
  }
  return data
}

async function fetchJsonWithCurl(url) {
  const { stdout } = await execFileAsync("curl.exe", ["-L", "-s", "--retry", "3", "--retry-all-errors", url], { maxBuffer: 20 * 1024 * 1024 })
  return JSON.parse(stdout)
}

async function fetchEspnFixtures(date) {
  const compactDate = date.replaceAll("-", "")
  const fixtures = []
  for (const league of ESPN_LEAGUES) {
    const data = await fetchJsonWithCurl(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard?dates=${compactDate}`)
    for (const event of data.events || []) {
      const competition = event.competitions?.[0]
      if (!competition?.status?.type?.completed) continue
      const home = competition.competitors?.find((team) => team.homeAway === "home")
      const away = competition.competitors?.find((team) => team.homeAway === "away")
      if (!home || !away) continue
      fixtures.push({
        source: "espn",
        espnLeagueCode: league.code,
        fixture: { id: Number(event.id), date: event.date, status: { short: "FT" } },
        league: { id: league.id, name: league.name },
        teams: { home: { name: home.team.displayName }, away: { name: away.team.displayName } },
        goals: { home: Number(home.score), away: Number(away.score) },
      })
    }
  }
  return fixtures
}

async function fetchEspnLineups(fixture) {
  const data = await fetchJsonWithCurl(`https://site.api.espn.com/apis/site/v2/sports/soccer/${fixture.espnLeagueCode}/summary?event=${fixture.fixture.id}`)
  return (data.rosters || []).flatMap((roster) => {
    const starters = (roster.roster || []).filter((entry) => entry.starter)
    if (starters.length !== 11) return []
    return [{
      team: { name: roster.team.displayName },
      formation: null,
      startXI: starters.map((entry) => ({
        player: { name: entry.athlete.fullName, pos: entry.position?.abbreviation || "" },
      })),
    }]
  })
}

function namesMatch(left, right) {
  const aliases = new Map([
    ["1899 hoffenheim", "hoffenheim"],
    ["tsg hoffenheim", "hoffenheim"],
  ])
  const normalizedLeft = aliases.get(normalize(left)) || normalize(left)
  const normalizedRight = aliases.get(normalize(right)) || normalize(right)
  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft)
}

function parseFormGroup(group) {
  const results = (group?.events || []).slice(-5).map((event) => event.gameResult).filter((result) => ["W", "D", "L"].includes(result))
  return {
    sequence: results.join(""),
    points: results.reduce((total, result) => total + (result === "W" ? 3 : result === "D" ? 1 : 0), 0),
    matches: results.length,
  }
}

async function getEspnFixtureMap(date) {
  const compactDate = date.replaceAll("-", "")
  const fixtures = []
  for (const league of ESPN_LEAGUES) {
    const data = await fetchJsonWithCurl(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard?dates=${compactDate}`)
    for (const event of data.events || []) {
      const competitors = event.competitions?.[0]?.competitors || []
      const home = competitors.find((team) => team.homeAway === "home")
      const away = competitors.find((team) => team.homeAway === "away")
      if (home && away) fixtures.push({ eventId: event.id, leagueCode: league.code, home: home.team.displayName, away: away.team.displayName })
    }
  }
  return fixtures
}

async function populateForm(cache) {
  const fixtureMap = await getEspnFixtureMap(DATE)
  for (const fixture of cache.fixtures) {
    if (cache.forms[fixture.fixture.id]) continue
    const mapped = fixture.source === "espn"
      ? { eventId: fixture.fixture.id, leagueCode: fixture.espnLeagueCode }
      : fixtureMap.find((entry) => namesMatch(entry.home, fixture.teams.home.name) && namesMatch(entry.away, fixture.teams.away.name))
    if (!mapped) {
      console.warn(`Form fixture not mapped: ${fixture.teams.home.name} v ${fixture.teams.away.name}`)
      continue
    }

    const summary = await fetchJsonWithCurl(`https://site.api.espn.com/apis/site/v2/sports/soccer/${mapped.leagueCode}/summary?event=${mapped.eventId}`)
    const homeGroup = (summary.lastFiveGames || []).find((group) => namesMatch(group.team?.displayName || "", fixture.teams.home.name))
    const awayGroup = (summary.lastFiveGames || []).find((group) => namesMatch(group.team?.displayName || "", fixture.teams.away.name))
    if (!homeGroup || !awayGroup) {
      console.warn(`Form unavailable: ${fixture.teams.home.name} v ${fixture.teams.away.name}`)
      continue
    }
    cache.forms[fixture.fixture.id] = { home: parseFormGroup(homeGroup), away: parseFormGroup(awayGroup), source: "ESPN pre-match last five games" }
    await saveCache(cache)
  }
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Quant Edge historical research workbook" } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.text()
}

function parseSquad(html) {
  const table = html.match(/<table[^>]*class="[^"]*table-roster[^"]*"[\s\S]*?<\/table>/i)?.[0]
  if (!table) return []

  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((rowMatch) => {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => textContent(cell[1]))
    const rating = Number(cells[6])
    if (cells.length < 7 || !cells[3] || !Number.isFinite(rating)) return []
    return [{ name: cells[3], position: cells[4], rating }]
  })
}

function findPlayerRating(lineupName, squad) {
  const target = normalize(lineupName)
  const targetParts = target.split(" ")
  const ratingOverride = PLAYER_RATING_OVERRIDES.get(target)
  if (ratingOverride) return ratingOverride
  const alias = PLAYER_ALIASES.get(target)
  if (alias) {
    const aliasMatch = squad.find((player) => normalize(player.name) === alias)
    if (aliasMatch) return aliasMatch
  }
  const exact = squad.find((player) => normalize(player.name) === target)
  if (exact) return exact

  const sortedTarget = [...targetParts].sort().join(" ")
  const reordered = squad.find((player) => normalize(player.name).split(" ").sort().join(" ") === sortedTarget)
  if (reordered) return reordered

  const contained = squad.filter((player) => {
    const candidate = normalize(player.name)
    return candidate.includes(target) || target.includes(candidate)
  })
  if (contained.length === 1) return contained[0]

  const surname = targetParts.at(-1)
  const surnameMatches = squad.filter((player) => normalize(player.name).split(" ").at(-1) === surname)
  if (surnameMatches.length === 1) return surnameMatches[0]

  const initial = targetParts[0]?.[0]
  const initialMatches = surnameMatches.filter((player) => normalize(player.name)[0] === initial)
  return initialMatches.length === 1 ? initialMatches[0] : null
}

async function getSquad(teamName, cache) {
  const teamAlias = TEAM_ALIASES.get(normalize(teamName))
  const cachedSquad = cache.squads[teamName]
  if (cachedSquad?.resolvedName && (!teamAlias?.clubId || cachedSquad.clubId === teamAlias.clubId)) return cachedSquad

  const searchUrl = `https://soccerwiki.org/search.php?q=${encodeURIComponent(teamAlias?.query || teamName)}`
  const club = teamAlias?.clubId
    ? { clubId: teamAlias.clubId, name: teamAlias.target }
    : parseClubSearch(await fetchText(searchUrl), teamAlias?.target || teamName)
  if (!club) {
    cache.squads[teamName] = { clubId: null, resolvedName: null, sourceUrl: searchUrl, players: [] }
    await saveCache(cache)
    return cache.squads[teamName]
  }

  const sourceUrl = `https://soccerwiki.org/squad.php?clubid=${club.clubId}`
  const players = parseSquad(await fetchText(sourceUrl))
  cache.squads[teamName] = { clubId: club.clubId, resolvedName: club.name, sourceUrl, players }
  await saveCache(cache)
  return cache.squads[teamName]
}

function styleWorksheet(worksheet, widths) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }]
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: widths.length } }
  worksheet.getRow(1).height = 24
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123047" } }
    cell.alignment = { vertical: "middle" }
  })
  widths.forEach((width, index) => { worksheet.getColumn(index + 1).width = width })
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2F5" } } })
    }
  })
}

async function main() {
  await loadEnv(await readFile(path.join(process.cwd(), ".env.local"), "utf8"))
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error("API_FOOTBALL_KEY is not configured")

  const cache = await readCache()
  if (!cache.fixtures.length) {
    try {
      const fixtureData = await fetchJson(`${API_URL}/fixtures?date=${DATE}`, apiKey)
      cache.fixtures = fixtureData.response.filter((fixture) => TOP_FIVE_LEAGUES.has(fixture.league.id))
    } catch (error) {
      console.warn(`API-Football fixtures unavailable (${error.message}); using ESPN historical data.`)
      cache.fixtures = await fetchEspnFixtures(DATE)
    }
    await saveCache(cache)
  }

  const missingLineups = cache.fixtures.filter((fixture) => !cache.lineups[fixture.fixture.id])
  for (const fixture of missingLineups.slice(0, MAX_LINEUP_REQUESTS)) {
    try {
      const confirmed = fixture.source === "espn"
        ? await fetchEspnLineups(fixture)
        : (await fetchJson(`${API_URL}/fixtures/lineups?fixture=${fixture.fixture.id}`, apiKey)).response.filter((lineup) => (lineup.startXI?.length || 0) >= 11)
      if (confirmed.length === 2) cache.lineups[fixture.fixture.id] = confirmed
      console.log(`Lineups ${fixture.fixture.id}: ${confirmed.length}/2`)
    } catch (error) {
      console.warn(`Lineups ${fixture.fixture.id}: ${error.message}`)
      break
    }
    await saveCache(cache)
  }

  const fixturesWithLineups = cache.fixtures.filter((fixture) => cache.lineups[fixture.fixture.id]?.length === 2)
  await populateForm(cache)
  const teamNames = [...new Set(fixturesWithLineups.flatMap((fixture) => [fixture.teams.home.name, fixture.teams.away.name]))]
  for (const teamName of teamNames) {
    try {
      const squad = await getSquad(teamName, cache)
      console.log(`Soccerwiki ${teamName}: ${squad.players.length} players`)
    } catch (error) {
      console.warn(`Soccerwiki ${teamName}: ${error.message}`)
    }
  }

  const matchRows = []
  const playerRows = []
  for (const fixture of cache.fixtures.sort((left, right) => left.fixture.date.localeCompare(right.fixture.date))) {
    const lineups = cache.lineups[fixture.fixture.id] || []
    const teamResults = []
    for (const side of ["home", "away"]) {
      const teamName = fixture.teams[side].name
      const lineup = lineups.find((entry) => entry.team.name === teamName)
      const squad = cache.squads[teamName]?.players || []
      const ratedPlayers = (lineup?.startXI || []).map((entry) => {
        const match = findPlayerRating(entry.player.name, squad)
        const row = {
          date: DATE,
          league: fixture.league.name,
          fixtureId: fixture.fixture.id,
          team: teamName,
          side,
          player: entry.player.name,
          matchedPlayer: match?.name || "",
          position: entry.player.pos || "",
          rating: match?.rating ?? null,
          status: match ? "Matched" : "Missing Soccerwiki rating",
          sourceUrl: cache.squads[teamName]?.sourceUrl || "",
        }
        playerRows.push(row)
        return row
      })
      const complete = ratedPlayers.length === 11 && ratedPlayers.every((player) => player.rating !== null)
      teamResults.push({
        side,
        total: complete ? ratedPlayers.reduce((sum, player) => sum + player.rating, 0) : null,
        missing: 11 - ratedPlayers.filter((player) => player.rating !== null).length,
      })
    }

    const home = teamResults.find((result) => result.side === "home")
    const away = teamResults.find((result) => result.side === "away")
    const complete = home?.total != null && away?.total != null
    const stronger = complete ? (home.total === away.total ? "Level" : home.total > away.total ? fixture.teams.home.name : fixture.teams.away.name) : "Incomplete"
    const winner = fixture.goals.home === fixture.goals.away ? "Draw" : fixture.goals.home > fixture.goals.away ? fixture.teams.home.name : fixture.teams.away.name
    const ratingPrediction = complete
      ? Math.abs(home.total - away.total) <= DRAW_THRESHOLD ? "Draw" : stronger
      : "Incomplete"
    const form = cache.forms[fixture.fixture.id]
    const formGap = form ? form.home.points - form.away.points : null
    const formPrediction = formGap === null
      ? "Incomplete"
      : Math.abs(formGap) <= FORM_DRAW_THRESHOLD
        ? "Draw"
        : formGap > 0 ? fixture.teams.home.name : fixture.teams.away.name
    const finalSelection = ratingPrediction === formPrediction ? ratingPrediction : "No bet"
    matchRows.push({
      date: DATE,
      league: fixture.league.name,
      fixtureId: fixture.fixture.id,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      score: `${fixture.goals.home}-${fixture.goals.away}`,
      homeTotal: home?.total ?? null,
      awayTotal: away?.total ?? null,
      gap: complete ? home.total - away.total : null,
      stronger,
      ratingPrediction,
      homeForm: form?.home.sequence || "",
      homeFormPoints: form?.home.points ?? null,
      awayForm: form?.away.sequence || "",
      awayFormPoints: form?.away.points ?? null,
      formGap,
      formPrediction,
      finalSelection,
      result: winner,
      predictionCorrect: finalSelection === "No bet" ? "No bet" : finalSelection === winner ? "Yes" : "No",
      missingRatings: (home?.missing ?? 11) + (away?.missing ?? 11),
      status: lineups.length === 2 ? (complete ? "Complete" : "Ratings missing") : "Confirmed lineup unavailable",
    })
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Quant Edge"
  workbook.created = new Date()
  workbook.description = `Confirmed XI Soccerwiki rating snapshot for the top five European leagues on ${DATE}`

  const matchesSheet = workbook.addWorksheet("Matches")
  matchesSheet.addRow(["Date", "League", "Fixture ID", "Home", "Away", "Score", "Home XI Total", "Away XI Total", "Rating Gap", "Rating Prediction", "Home Form", "Home Form Points", "Away Form", "Away Form Points", "Form Gap", "Form Prediction", "Final Selection", "Result", "Selection Correct?", "Missing Ratings", "Data Status"])
  for (const row of matchRows) matchesSheet.addRow([row.date, row.league, row.fixtureId, row.homeTeam, row.awayTeam, row.score, row.homeTotal, row.awayTotal, row.gap, row.ratingPrediction, row.homeForm, row.homeFormPoints, row.awayForm, row.awayFormPoints, row.formGap, row.formPrediction, row.finalSelection, row.result, row.predictionCorrect, row.missingRatings, row.status])
  styleWorksheet(matchesSheet, [12, 18, 12, 24, 24, 10, 15, 15, 13, 24, 13, 17, 13, 17, 12, 24, 24, 24, 19, 16, 28])
  matchesSheet.getColumn(9).numFmt = "+0;-0;0"
  matchesSheet.getColumn(15).numFmt = "+0;-0;0"

  const playersSheet = workbook.addWorksheet("Player Ratings")
  playersSheet.addRow(["Date", "League", "Fixture ID", "Team", "Side", "Lineup Name", "Soccerwiki Match", "Position", "Rating", "Match Status", "Source"])
  for (const row of playerRows) playersSheet.addRow([row.date, row.league, row.fixtureId, row.team, row.side, row.player, row.matchedPlayer, row.position, row.rating, row.status, row.sourceUrl])
  styleWorksheet(playersSheet, [12, 18, 12, 24, 10, 24, 26, 12, 10, 28, 45])

  const sourcesSheet = workbook.addWorksheet("Method & Sources")
  const lineupSource = cache.fixtures.some((fixture) => fixture.source === "espn")
    ? "ESPN historical match summaries (confirmed starters and final scores)"
    : "API-Football confirmed starting XIs and final scores"
  sourcesSheet.addRows([
    ["Field", "Detail"],
    ["Fixture date", DATE],
    ["Competitions", "Premier League, La Liga, Bundesliga, Serie A, Ligue 1"],
    ["Lineups and results", lineupSource],
    ["Player ratings", "Public Soccerwiki squad rating tables, captured when this workbook was generated"],
    ["Calculation", "Team total = sum of the 11 matched starting-player ratings"],
    ["Ratings rule", `Predict a draw when the absolute team-total gap is ${DRAW_THRESHOLD} points or less; otherwise predict the stronger-rated team.`],
    ["Form rule", `Award 3 points per win and 1 per draw across the five pre-match fixtures. Predict a draw at a ${FORM_DRAW_THRESHOLD}-point gap or less; otherwise predict the team ahead by at least ${FORM_DRAW_THRESHOLD + 1} points.`],
    ["Final selection", "Select only when the ratings prediction and form prediction are identical; otherwise mark No bet."],
    ["Missing data", "No estimate is substituted. Incomplete teams and matches are explicitly flagged."],
    ["Usage", "Internal product research snapshot; not an automated or licensed Soccerwiki feed"],
  ])
  styleWorksheet(sourcesSheet, [24, 100])
  sourcesSheet.getColumn(2).alignment = { wrapText: true, vertical: "top" }

  await workbook.xlsx.writeFile(OUTPUT_PATH)
  const completeMatches = matchRows.filter((row) => row.status === "Complete").length
  console.log(`Workbook: ${OUTPUT_PATH}`)
  console.log(`Fixtures: ${matchRows.length}; complete: ${completeMatches}; cached lineups: ${fixturesWithLineups.length}`)
  if (fixturesWithLineups.length < cache.fixtures.length) {
    console.log(`Run again to collect ${cache.fixtures.length - fixturesWithLineups.length} remaining lineups within the provider rate limit.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})