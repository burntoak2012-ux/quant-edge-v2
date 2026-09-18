import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireActiveSubscription } from "@/lib/requireSubscription"

const API_URL = "https://v3.football.api-sports.io"

type TeamResponse = {
  response?: Array<{
    team?: { id?: number; name?: string; code?: string; country?: string; founded?: number; logo?: string }
    venue?: { name?: string; city?: string; capacity?: number }
  }>
  errors?: Record<string, string>
}

type StatsResponse = {
  response?: {
    fixtures?: {
      played?: { total?: number }
      wins?: { total?: number }
      draws?: { total?: number }
      loses?: { total?: number }
    }
    goals?: {
      for?: { total?: { total?: number } }
      against?: { total?: { total?: number } }
    }
    clean_sheet?: { total?: number }
    form?: string
  }
  errors?: Record<string, string>
}

type PlayersResponse = {
  response?: Array<{
    player?: { id?: number; name?: string; photo?: string; nationality?: string }
    statistics?: Array<{ games?: { position?: string; appearances?: number }; goals?: { total?: number; assists?: number } }>
  }>
}

const POSITION_GROUPS = [
  { key: "Goalkeeper", label: "Goalkeepers" },
  { key: "Defender", label: "Defenders" },
  { key: "Midfielder", label: "Midfielders" },
  { key: "Attacker", label: "Forwards" },
] as const

function numberOrDash(value?: number) {
  return typeof value === "number" ? value : "-"
}

function summarizeForm(form?: string) {
  const results = (form || "").toUpperCase().split("").filter((result) => "WDL".includes(result)).slice(-5)
  const points = results.reduce((total, result) => total + (result === "W" ? 3 : result === "D" ? 1 : 0), 0)
  let unbeaten = 0
  for (const result of results.reverse()) {
    if (result === "L") break
    unbeaten += 1
  }
  return { results, points, unbeaten }
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ league?: string }>
}) {
  const access = await requireActiveSubscription()
  if (!access.ok) redirect(access.status === 401 ? "/sign-in" : "/pricing")

  const { id } = await params
  const { league } = await searchParams
  const teamId = Number(id)
  const leagueId = Number(league)
  const apiKey = process.env.API_FOOTBALL_KEY

  if (!Number.isInteger(teamId) || !apiKey) notFound()

  const headers = { "x-apisports-key": apiKey }
  const season = new Date().getUTCFullYear()
  const baselineSeason = 2024
  const teamUrl = `${API_URL}/teams?id=${teamId}`
  const statsUrl = Number.isInteger(leagueId)
    ? `${API_URL}/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`
    : null

  const statsRequest = statsUrl
    ? (async () => {
        for (const requestedSeason of [season, baselineSeason]) {
          if (requestedSeason === baselineSeason && season === baselineSeason) continue
          const response = await fetch(`${API_URL}/teams/statistics?team=${teamId}&league=${leagueId}&season=${requestedSeason}`, { headers, next: { revalidate: 21600 } })
          const data = await response.json() as StatsResponse
          if (data.response) return { data, season: requestedSeason }
        }
        return null
      })()
    : Promise.resolve(null)

  const playersRequest = (async () => {
    for (const requestedSeason of [season, baselineSeason]) {
      if (requestedSeason === baselineSeason && season === baselineSeason) continue
      const response = await fetch(`${API_URL}/players?team=${teamId}&season=${requestedSeason}`, { headers, next: { revalidate: 21600 } })
      const data = await response.json() as PlayersResponse
      if (data.response && data.response.length > 0) return { data, season: requestedSeason }
    }
    return null
  })()

  const [teamResult, statsResult, playersResult] = await Promise.all([
    fetch(teamUrl, { headers, cache: "no-store" }).then((response) => response.json() as Promise<TeamResponse>),
    statsRequest,
    playersRequest,
  ])

  const team = teamResult.response?.[0]
  if (!team?.team?.name) notFound()

  const stats = statsResult?.data.response
  const played = stats?.fixtures?.played?.total
  const wins = stats?.fixtures?.wins?.total
  const draws = stats?.fixtures?.draws?.total
  const losses = stats?.fixtures?.loses?.total
  const goalsFor = stats?.goals?.for?.total?.total
  const goalsAgainst = stats?.goals?.against?.total?.total
  const cleanSheets = stats?.clean_sheet?.total
  const formSummary = summarizeForm(stats?.form)
  const goalsPerGame = played && typeof goalsFor === "number" ? (goalsFor / played).toFixed(2) : "-"
  const concededPerGame = played && typeof goalsAgainst === "number" ? (goalsAgainst / played).toFixed(2) : "-"
  const cleanSheetRate = played && typeof cleanSheets === "number" ? `${Math.round((cleanSheets / played) * 100)}%` : "-"
  const players = playersResult?.data.response || []
  const groupedPlayers = POSITION_GROUPS.map((group) => ({
    ...group,
    players: players.filter((entry) => entry.statistics?.[0]?.games?.position?.includes(group.key)),
  }))

  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/app">Back to today&apos;s fixtures</Link>
        <header className="qe-panel mt-6 rounded-3xl border p-6 shadow-xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Team profile</p>
              <h1 className="mt-2 text-4xl font-bold">{team.team.name}</h1>
              <p className="mt-2 text-slate-400">{team.team.country || "European competition"}{team.team.code ? ` • ${team.team.code}` : ""}</p>
            </div>
            {team.team.logo && <img alt="" className="h-20 w-20 object-contain" src={team.team.logo} />}
          </div>
          <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="border-l-2 border-cyan-300 pl-3"><p className="text-xs text-slate-500">Founded</p><p className="mt-1 font-semibold">{numberOrDash(team.team.founded)}</p></div>
            <div className="border-l-2 border-cyan-300 pl-3"><p className="text-xs text-slate-500">Home venue</p><p className="mt-1 font-semibold">{team.venue?.name || "Unavailable"}</p></div>
            <div className="border-l-2 border-cyan-300 pl-3"><p className="text-xs text-slate-500">Venue city</p><p className="mt-1 font-semibold">{team.venue?.city || "Unavailable"}</p></div>
          </div>
        </header>

        <section className="mt-6 border-t border-slate-800 pt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Season snapshot</p>
              <h2 className="mt-2 text-2xl font-bold">Recent competition stats</h2>
            </div>
            <span className="text-xs text-slate-500">{statsResult?.season || season} baseline</span>
          </div>
          {stats ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Played", played],
                ["Wins", wins],
                ["Draws", draws],
                ["Losses", losses],
                ["Goals for", goalsFor],
                ["Goals against", goalsAgainst],
                ["Form", stats.form || "-"],
              ].map(([label, value]) => (
                <div className="qe-panel rounded-2xl border p-4" key={label}>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value ?? "-"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">Competition statistics are unavailable for this fixture.</div>
          )}
        </section>

        <section className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Analyst snapshot</p>
          <h2 className="mt-2 text-2xl font-bold">What the numbers suggest</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Last five</p><p className="mt-2 text-2xl font-semibold tracking-[0.18em] text-white">{formSummary.results.join(" ") || "-"}</p><p className="mt-2 text-xs text-slate-400">{formSummary.points} points from the latest five</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Unbeaten run</p><p className="mt-2 text-2xl font-semibold text-white">{formSummary.unbeaten || "-"}</p><p className="mt-2 text-xs text-slate-400">consecutive matches</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Goals per game</p><p className="mt-2 text-2xl font-semibold text-cyan-200">{goalsPerGame}</p><p className="mt-2 text-xs text-slate-400">{concededPerGame} conceded per game</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Clean sheets</p><p className="mt-2 text-2xl font-semibold text-lime-200">{cleanSheetRate}</p><p className="mt-2 text-xs text-slate-400">of completed matches</p></div>
          </div>
        </section>

        <section className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Squad directory</p>
          <h2 className="mt-2 text-2xl font-bold">Players by position</h2>
          {players.length > 0 ? (
            <div className="mt-5 space-y-8">
              {groupedPlayers.map((group) => group.players.length > 0 && <section key={group.key}>
                <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-lg font-semibold">{group.label}</h3>
                  <span className="text-xs text-slate-500">{group.players.length} players</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.players.map((entry) => {
                const player = entry.player
                const statistic = entry.statistics?.[0]
                if (!player?.id || !player.name) return null

                return (
                  <Link className="qe-panel rounded-2xl border p-4" href={`/players/${player.id}?team=${teamId}&league=${leagueId}`} key={player.id}>
                    <div className="flex items-center gap-3">
                      {player.photo && <img alt="" className="h-10 w-10 rounded-full object-cover" src={player.photo} />}
                      <div>
                        <p className="font-semibold text-white">{player.name}</p>
                        <p className="text-xs text-slate-500">{statistic?.games?.position || player.nationality || "Player"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-xs text-slate-400">
                      <span>Apps {statistic?.games?.appearances ?? "-"}</span>
                      <span>Goals {statistic?.goals?.total ?? "-"}</span>
                      <span>Assists {statistic?.goals?.assists ?? "-"}</span>
                    </div>
                  </Link>
                )
                  })}
                </div>
              </section>)}
            </div>
          ) : (
            <p className="mt-5 border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">The current squad directory is unavailable.</p>
          )}
        </section>
      </div>
    </main>
  )
}
