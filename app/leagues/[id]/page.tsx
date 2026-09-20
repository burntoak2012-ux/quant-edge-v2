import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireActiveSubscription } from "@/lib/requireSubscription"
import { getLeague, SUPPORTED_BASELINE_SEASON } from "@/lib/leagues"

const API_URL = "https://v3.football.api-sports.io"

type Standing = {
  rank: number
  team: { id: number; name: string; logo?: string }
  points: number
  goalsDiff: number
  form?: string
  all?: { played?: number; win?: number; draw?: number; lose?: number; goals?: { for?: number; against?: number } }
}

type Fixture = {
  fixture: { id: number; date?: string; status?: { long?: string; short?: string } }
  league: { round?: string }
  teams: { home: { id: number; name: string }; away: { id: number; name: string } }
  goals?: { home?: number | null; away?: number | null }
}

type LeagueResponse = {
  response?: Array<{ league?: { name?: string; season?: number; standings?: Standing[][] } }>
}

type FixturesResponse = { response?: Fixture[] }

type LeaderboardEntry = {
  player?: { id?: number; name?: string; photo?: string }
  statistics?: Array<{
    team?: { name?: string }
    goals?: { total?: number; assists?: number }
    games?: { appearances?: number; rating?: string }
    cards?: { yellow?: number; red?: number }
  }>
}

type LeaderboardResponse = { response?: LeaderboardEntry[] }

async function fetchSeasonData<T>(endpoint: string, apiKey: string, currentSeason: number) {
  for (const season of [currentSeason, SUPPORTED_BASELINE_SEASON]) {
    if (season === SUPPORTED_BASELINE_SEASON && currentSeason === SUPPORTED_BASELINE_SEASON) continue
    const response = await fetch(`${API_URL}/${endpoint}&season=${season}`, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 21600 },
    })
    if (!response.ok) continue
    const data = await response.json() as T & { response?: unknown[] }
    if (data.response && data.response.length > 0) return { data, season }
  }
  return null
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable"
  return new Date(value).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
}

function isCompleted(fixture: Fixture) {
  return fixture.goals?.home !== null && fixture.goals?.home !== undefined
    && fixture.goals?.away !== null && fixture.goals?.away !== undefined
}

function buildLeagueInsight(topTeam?: Standing, topScorer?: string, avgGoals?: number, nextFixture?: string) {
  if (!topTeam && !topScorer) return "This competition is still in a development phase. The season profile is best understood by tracking the leader, goal rate, and the next key fixture." 

  const parts = [
    topTeam ? `${topTeam.team.name} are leading the table with ${topTeam.points} points.` : "The table remains competitive.",
    topScorer ? `${topScorer} is currently the standout offensive profile in the competition.` : "The scoring chart is still shifting.",
    avgGoals ? `The average match is producing ${avgGoals.toFixed(2)} goals.` : "The production profile is still settling.",
    nextFixture ? `The next standout matchup is ${nextFixture}.` : "The next schedule window will clarify the form arc.",
  ]

  return parts.join(" ")
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const access = await requireActiveSubscription()
  if (!access.ok) redirect(access.status === 401 ? "/sign-in" : "/pricing")

  const { id } = await params
  const leagueId = Number(id)
  const league = getLeague(leagueId)
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!league || !apiKey) notFound()

  const season = new Date().getUTCFullYear()
  const [standingsResult, fixturesResult] = await Promise.all([
    fetchSeasonData<LeagueResponse>(`standings?league=${leagueId}`, apiKey, season),
    fetchSeasonData<FixturesResponse>(`fixtures?league=${leagueId}`, apiKey, season),
  ])
  const leaderboardTypes = [
    ["Top scorers", "players/topscorers"],
    ["Top assists", "players/topassists"],
    ["Most yellow cards", "players/topyellowcards"],
  ] as const
  const leaderboardResults = await Promise.all(
    leaderboardTypes.map(async ([, endpoint]) => fetchSeasonData<LeaderboardResponse>(`${endpoint}?league=${leagueId}`, apiKey, season))
  )

  const standings = standingsResult?.data.response?.[0]?.league?.standings?.[0] || []
  const fixtures = fixturesResult?.data.response || []
  const displayedSeason = standingsResult?.season || fixturesResult?.season || SUPPORTED_BASELINE_SEASON
  const recentFixtures = fixtures
    .filter(isCompleted)
    .sort((a, b) => new Date(b.fixture.date || 0).getTime() - new Date(a.fixture.date || 0).getTime())
    .slice(0, 5)
  const upcomingFixtures = fixtures
    .filter((fixture) => !isCompleted(fixture))
    .sort((a, b) => new Date(a.fixture.date || 0).getTime() - new Date(b.fixture.date || 0).getTime())
    .slice(0, 5)
  const leaderboardCards = leaderboardTypes.map(([title], index) => ({
    title,
    entries: Array.isArray(leaderboardResults[index]?.data.response) ? leaderboardResults[index]?.data.response?.slice(0, 10) || [] : [],
  }))
  const completedFixtures = fixtures.filter((fixture) => fixture.goals?.home !== null && fixture.goals?.home !== undefined && fixture.goals?.away !== null && fixture.goals?.away !== undefined)
  const competitionGoals = completedFixtures.reduce((total, fixture) => total + (fixture.goals?.home || 0) + (fixture.goals?.away || 0), 0)
  const topTeam = standings[0]
  const topScorer = leaderboardCards[0].entries[0]?.player?.name
  const avgGoals = completedFixtures.length > 0 ? competitionGoals / completedFixtures.length : 0
  const nextFixture = upcomingFixtures[0]
    ? `${upcomingFixtures[0].teams.home.name} vs ${upcomingFixtures[0].teams.away.name}`
    : undefined
  const leagueInsight = buildLeagueInsight(topTeam, topScorer, avgGoals, nextFixture)

  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-7xl">
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/leagues">Back to leagues</Link>
        <header className="mt-6 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{league.country} competition</p>
            <h1 className="mt-2 text-4xl font-bold">{league.name}</h1>
          </div>
          <p className="text-sm text-slate-500">{displayedSeason} season baseline</p>
        </header>

        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-slate-950/60 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">League insight</p>
          <p className="mt-3 text-lg leading-8 text-slate-200">{leagueInsight}</p>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Table</p>
                <h2 className="mt-2 text-2xl font-bold">Standings</h2>
              </div>
              <span className="text-xs text-slate-500">{standings.length} teams</span>
            </div>
            <div className="qe-panel mt-5 overflow-x-auto rounded-2xl border">
              {standings.length > 0 ? (
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Team</th><th className="px-3 py-3">P</th><th className="px-3 py-3">W</th><th className="px-3 py-3">D</th><th className="px-3 py-3">L</th><th className="px-3 py-3">GD</th><th className="px-3 py-3">Pts</th></tr>
                  </thead>
                  <tbody>
                    {standings.map((entry) => (
                      <tr className="border-t border-slate-800" key={entry.team.id}>
                        <td className="px-3 py-3 text-slate-500">{entry.rank}</td>
                        <td className="px-3 py-3"><Link className="font-semibold text-cyan-200 hover:text-cyan-100" href={`/teams/${entry.team.id}?league=${leagueId}`}>{entry.team.name}</Link></td>
                        <td className="px-3 py-3">{entry.all?.played ?? "-"}</td>
                        <td className="px-3 py-3">{entry.all?.win ?? "-"}</td>
                        <td className="px-3 py-3">{entry.all?.draw ?? "-"}</td>
                        <td className="px-3 py-3">{entry.all?.lose ?? "-"}</td>
                        <td className="px-3 py-3">{entry.goalsDiff > 0 ? `+${entry.goalsDiff}` : entry.goalsDiff}</td>
                        <td className="px-3 py-3 font-bold text-white">{entry.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="p-5 text-sm text-slate-400">Standings are unavailable for this competition.</p>}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Schedule</p>
                <h2 className="mt-2 text-2xl font-bold">Previous and next fixtures</h2>
              </div>
              <span className="text-xs text-slate-500">{fixtures.length} matches in season</span>
            </div>
            <div className="mt-4">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-300">Last fixtures</p>
                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">Scroll</span>
                  </div>
                  <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                    {recentFixtures.length > 0 ? recentFixtures.map((fixture) => (
                      <Link
                        className="qe-panel min-w-[240px] snap-start rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-lime-300/50 hover:bg-slate-900"
                        href={`/fixtures/${fixture.fixture.id}?home=${fixture.teams.home.id}&away=${fixture.teams.away.id}&league=${leagueId}`}
                        key={fixture.fixture.id}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{formatDate(fixture.fixture.date)}</p>
                        <div className="mt-3 space-y-1">
                          <p className="truncate text-sm font-semibold text-white">{fixture.teams.home.name}</p>
                          <p className="truncate text-sm font-semibold text-white">{fixture.teams.away.name}</p>
                        </div>
                        <p className="mt-4 text-xl font-bold text-lime-200">{fixture.goals?.home ?? "-"} - {fixture.goals?.away ?? "-"}</p>
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Open match brief</p>
                      </Link>
                    )) : <p className="text-sm text-slate-400">No completed fixtures are available.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Next fixtures</p>
                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">Scroll</span>
                  </div>
                  <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                    {upcomingFixtures.length > 0 ? upcomingFixtures.map((fixture) => (
                      <Link
                        className="qe-panel min-w-[240px] snap-start rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-cyan-300/50 hover:bg-slate-900"
                        href={`/fixtures/${fixture.fixture.id}?home=${fixture.teams.home.id}&away=${fixture.teams.away.id}&league=${leagueId}`}
                        key={fixture.fixture.id}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{formatDate(fixture.fixture.date)}</p>
                        <div className="mt-3 space-y-1">
                          <p className="truncate text-sm font-semibold text-white">{fixture.teams.home.name}</p>
                          <p className="truncate text-sm font-semibold text-white">{fixture.teams.away.name}</p>
                        </div>
                        <p className="mt-4 text-sm font-semibold text-cyan-200">Scheduled</p>
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Open match brief</p>
                      </Link>
                    )) : <p className="text-sm text-slate-400">No upcoming fixtures are available.</p>}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-10 border-t border-slate-800 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Competition snapshot</p>
          <h2 className="mt-2 text-2xl font-bold">The shape of this season</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Current leader</p><p className="mt-2 truncate text-lg font-semibold text-white">{topTeam?.team.name || "-"}</p><p className="mt-2 text-xs text-slate-400">{topTeam ? `${topTeam.points} points` : "Standings unavailable"}</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Top scorer</p><p className="mt-2 truncate text-lg font-semibold text-cyan-200">{topScorer || "-"}</p><p className="mt-2 text-xs text-slate-400">from the current leaderboard</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Completed fixtures</p><p className="mt-2 text-2xl font-semibold text-white">{completedFixtures.length}</p><p className="mt-2 text-xs text-slate-400">of {fixtures.length} listed</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Goals / match</p><p className="mt-2 text-2xl font-semibold text-lime-200">{completedFixtures.length ? (competitionGoals / completedFixtures.length).toFixed(2) : "-"}</p><p className="mt-2 text-xs text-slate-400">completed matches</p></div>
          </div>
        </section>

        <section className="mt-10 border-t border-slate-800 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Leaderboards</p>
          <h2 className="mt-2 text-2xl font-bold">Season leaders</h2>
          <p className="mt-2 text-sm text-slate-400">Goals, assists, and discipline leaders from the {displayedSeason} data set.</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {leaderboardCards.map((board) => (
              <div className="qe-panel rounded-2xl border" key={board.title}>
                <h3 className="border-b border-slate-800 px-4 py-3 font-semibold">{board.title}</h3>
                {board.entries.length > 0 ? board.entries.map((entry, index) => {
                  const player = entry.player
                  const stats = entry.statistics?.[0]
                  if (!player?.id || !player.name) return null
                  const value = board.title === "Top scorers"
                    ? stats?.goals?.total
                    : board.title === "Top assists"
                      ? stats?.goals?.assists
                      : stats?.cards?.yellow
                  const numericValue = typeof value === "number" ? value : Number(value || 0)
                  const maximum = Math.max(...board.entries.map((item) => {
                    const itemStats = item.statistics?.[0]
                    const itemValue = board.title === "Top scorers" ? itemStats?.goals?.total : board.title === "Top assists" ? itemStats?.goals?.assists : itemStats?.cards?.yellow
                    return typeof itemValue === "number" ? itemValue : Number(itemValue || 0)
                  }), 1)
                  return (
                    <Link className="block border-b border-slate-800 px-4 py-3 last:border-b-0 hover:bg-slate-800/60" href={`/players/${player.id}?league=${leagueId}`} key={player.id}>
                      <div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-3"><span className="w-5 text-xs text-slate-500">{index + 1}</span><span className="truncate text-sm font-medium">{player.name}</span></span><span className="text-sm font-bold text-cyan-300">{value ?? "-"}</span></div>
                      <div className="mt-2 h-1.5 bg-slate-800"><div className="h-full bg-cyan-300" style={{ width: `${Math.max(6, (numericValue / maximum) * 100)}%` }} /></div>
                    </Link>
                  )
                }) : <p className="p-4 text-sm text-slate-400">No leaderboard data available.</p>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
