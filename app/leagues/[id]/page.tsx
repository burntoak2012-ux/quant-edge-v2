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

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string; date?: string; round?: string }>
}) {
  const access = await requireActiveSubscription()
  if (!access.ok) redirect(access.status === 401 ? "/sign-in" : "/pricing")

  const { id } = await params
  const filters = await searchParams
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
  const groupedFixtures = fixtures.reduce<Record<string, Fixture[]>>((groups, fixture) => {
    const round = fixture.league.round || "Fixtures"
    groups[round] = groups[round] || []
    groups[round].push(fixture)
    return groups
  }, {})
  const rounds = Object.keys(groupedFixtures)
  const roundIndex = Math.min(Math.max(Number.parseInt(filters.round || "0", 10) || 0, 0), Math.max(rounds.length - 1, 0))
  const activeView = filters.view === "date" ? "date" : "matchday"
  const activeDate = filters.date || fixtures[0]?.fixture.date?.slice(0, 10) || ""
  const visibleFixtures = activeView === "date"
    ? fixtures.filter((fixture) => fixture.fixture.date?.slice(0, 10) === activeDate)
    : groupedFixtures[rounds[roundIndex]] || []
  const previousRound = Math.max(roundIndex - 1, 0)
  const nextRound = Math.min(roundIndex + 1, Math.max(rounds.length - 1, 0))
  const leagueHref = (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return `/leagues/${leagueId}?${query}`
  }

  const leaderboardCards = leaderboardTypes.map(([title], index) => ({
    title,
    entries: Array.isArray(leaderboardResults[index]?.data.response) ? leaderboardResults[index]?.data.response?.slice(0, 10) || [] : [],
  }))

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-7xl">
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/leagues">Back to leagues</Link>
        <header className="mt-6 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{league.country} competition</p>
            <h1 className="mt-2 text-4xl font-bold">{league.name}</h1>
          </div>
          <p className="text-sm text-slate-500">{displayedSeason} season baseline</p>
        </header>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Table</p>
                <h2 className="mt-2 text-2xl font-bold">Standings</h2>
              </div>
              <span className="text-xs text-slate-500">{standings.length} teams</span>
            </div>
            <div className="mt-5 overflow-x-auto border border-slate-800">
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
                <h2 className="mt-2 text-2xl font-bold">All fixtures</h2>
              </div>
              <span className="text-xs text-slate-500">{fixtures.length} matches in season</span>
            </div>
            <div className="mt-5 border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex border border-slate-700 p-1 text-sm">
                  <Link className={`px-3 py-2 ${activeView === "matchday" ? "bg-cyan-300 font-semibold text-slate-950" : "text-slate-300 hover:text-white"}`} href={leagueHref({ view: "matchday", round: String(roundIndex) })}>Matchday</Link>
                  <Link className={`px-3 py-2 ${activeView === "date" ? "bg-cyan-300 font-semibold text-slate-950" : "text-slate-300 hover:text-white"}`} href={leagueHref({ view: "date", date: activeDate })}>Date</Link>
                </div>
                {activeView === "matchday" ? (
                  <div className="flex items-center gap-2">
                    <Link aria-label="Previous matchday" className="flex h-9 w-9 items-center justify-center border border-slate-700 text-lg hover:border-cyan-300" href={leagueHref({ view: "matchday", round: String(previousRound) })}>&larr;</Link>
                    <span className="min-w-32 text-center text-sm font-semibold text-slate-200">{rounds[roundIndex] || "Matchday unavailable"}</span>
                    <Link aria-label="Next matchday" className="flex h-9 w-9 items-center justify-center border border-slate-700 text-lg hover:border-cyan-300" href={leagueHref({ view: "matchday", round: String(nextRound) })}>&rarr;</Link>
                  </div>
                ) : (
                  <form className="flex items-center gap-2" method="get">
                    <input name="view" type="hidden" value="date" />
                    <input className="h-9 border border-slate-700 bg-slate-950 px-2 text-sm text-white" name="date" type="date" value={activeDate} />
                    <button className="h-9 border border-cyan-300 px-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-300/10" type="submit">Show date</button>
                  </form>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">Showing {visibleFixtures.length} fixtures in this view. Use the arrows to move through the season.</p>
            </div>
            <div className="mt-4">
              {visibleFixtures.length > 0 ? (
                <div className="border border-slate-800">
                    {visibleFixtures.map((fixture) => (
                      <div className="grid gap-2 border-b border-slate-800 p-3 last:border-b-0 sm:grid-cols-[110px_minmax(0,1fr)_90px] sm:items-center" key={fixture.fixture.id}>
                        <p className="text-xs text-slate-500">{formatDate(fixture.fixture.date)}</p>
                        <div className="text-sm">
                          <Link className="font-semibold hover:text-cyan-300" href={`/teams/${fixture.teams.home.id}?league=${leagueId}`}>{fixture.teams.home.name}</Link>
                          <span className="mx-2 text-slate-600">vs</span>
                          <Link className="font-semibold hover:text-cyan-300" href={`/teams/${fixture.teams.away.id}?league=${leagueId}`}>{fixture.teams.away.name}</Link>
                        </div>
                        <p className="text-left text-xs text-slate-500 sm:text-right">{fixture.goals?.home !== null && fixture.goals?.home !== undefined ? `${fixture.goals.home} - ${fixture.goals.away}` : fixture.fixture.status?.short || "Scheduled"}</p>
                      </div>
                    ))}
                </div>
              ) : <p className="border border-slate-800 p-5 text-sm text-slate-400">No fixtures are available for this selection.</p>}
            </div>
          </section>
        </div>

        <section className="mt-10 border-t border-slate-800 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Leaderboards</p>
          <h2 className="mt-2 text-2xl font-bold">Season leaders</h2>
          <p className="mt-2 text-sm text-slate-400">Goals, assists, and discipline leaders from the {displayedSeason} data set.</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {leaderboardCards.map((board) => (
              <div className="border border-slate-800 bg-slate-900" key={board.title}>
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
