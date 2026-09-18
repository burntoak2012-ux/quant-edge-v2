import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireActiveSubscription } from "@/lib/requireSubscription"
import { calculateQuantPlayerRating } from "@/lib/quantRating"

const API_URL = "https://v3.football.api-sports.io"

type PlayerResponse = {
  response?: Array<{
    player?: { id?: number; name?: string; age?: number; nationality?: string; photo?: string }
    statistics?: Array<{
      team?: { name?: string }
      league?: { name?: string }
      games?: { appearences?: number; appearances?: number; lineups?: number; minutes?: number; position?: string; rating?: string }
      goals?: { total?: number; assists?: number }
      passes?: { key?: number }
      tackles?: { total?: number }
      interceptions?: number
    }>
  }>
}

type SeasonsResponse = { response?: number[] }

function display(value?: number | string) {
  return value === undefined || value === null || value === "" ? "-" : value
}

function formatSeason(season: number) {
  return `${season}/${String((season + 1) % 100).padStart(2, "0")}`
}

function normalizedAppearances(minutes?: number, appearances?: number) {
  if (typeof appearances === "number" && appearances > 0) return appearances
  if (typeof minutes === "number" && minutes > 0) return Math.ceil(minutes / 90)
  return appearances ?? 0
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ team?: string; league?: string }>
}) {
  const access = await requireActiveSubscription()
  if (!access.ok) redirect(access.status === 401 ? "/sign-in" : "/pricing")

  const { id } = await params
  const { team, league } = await searchParams
  const playerId = Number(id)
  const season = new Date().getUTCFullYear()
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!Number.isInteger(playerId) || !apiKey) notFound()

  let data: PlayerResponse | null = null
  let dataSeason = season
  for (const requestedSeason of [season, 2024]) {
    if (requestedSeason === 2024 && season === 2024) continue
    const response = await fetch(`${API_URL}/players?id=${playerId}&season=${requestedSeason}`, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 21600 },
    })
    const candidate = await response.json() as PlayerResponse
    if (candidate.response && candidate.response.length > 0) {
      data = candidate
      dataSeason = requestedSeason
      break
    }
  }
  if (!data) notFound()
  const entry = data.response?.[0]
  const player = entry?.player
  const stats = entry?.statistics?.[0]
  if (!player?.name) notFound()
  const seasonsResponse = await fetch(`${API_URL}/players/seasons?player=${playerId}`, {
    headers: { "x-apisports-key": apiKey },
    next: { revalidate: 86400 },
  })
  const seasonData = await seasonsResponse.json() as SeasonsResponse
  const careerSeasons = (seasonData.response || []).filter((value) => value <= season).slice(-8).reverse()
  const careerHistory = (await Promise.all(careerSeasons.map(async (careerSeason) => {
    const response = await fetch(`${API_URL}/players?id=${playerId}&season=${careerSeason}`, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 86400 },
    })
    const careerData = await response.json() as PlayerResponse
    const careerStats = careerData.response?.[0]?.statistics || []
    return careerStats.map((careerStat) => ({ season: careerSeason, ...careerStat }))
  }))).flat().filter((careerStat) => careerStat.games)
  const normalizedCareerHistory = careerHistory.map((careerStat) => {
    const minutes = careerStat.games?.minutes
    const appearances = normalizedAppearances(minutes, careerStat.games?.appearences ?? careerStat.games?.appearances)
    const providerRating = careerStat.games?.rating ? Number(careerStat.games.rating) : undefined
    return {
      ...careerStat,
      normalizedAppearances: appearances,
      quantRating: minutes || appearances
        ? calculateQuantPlayerRating({
            baseRating: 72,
            position: careerStat.games?.position,
            form: providerRating ? providerRating * 10 : undefined,
            performanceRating: providerRating ? providerRating * 10 : undefined,
            minutes,
            appearances,
            goals: careerStat.goals?.total,
            assists: careerStat.goals?.assists,
            isStarter: (careerStat.games?.lineups || 0) > 0,
          })
        : null,
    }
  })
  const careerBySeason = normalizedCareerHistory.reduce<Record<number, typeof normalizedCareerHistory>>((groups, careerStat) => {
    groups[careerStat.season] = groups[careerStat.season] || []
    groups[careerStat.season].push(careerStat)
    return groups
  }, {})
  const orderedCareerSeasons = Object.keys(careerBySeason).map(Number).sort((a, b) => b - a)
  const quantRating = calculateQuantPlayerRating({
    baseRating: 72,
    position: stats?.games?.position,
    form: stats?.games?.rating ? Number(stats.games.rating) : undefined,
    performanceRating: stats?.games?.rating ? Number(stats.games.rating) : undefined,
    minutes: stats?.games?.minutes,
    appearances: stats?.games?.appearences ?? stats?.games?.appearances,
    goals: stats?.goals?.total,
    assists: stats?.goals?.assists,
    tackles: stats?.tackles?.total,
    interceptions: stats?.interceptions,
    isStarter: (stats?.games?.lineups || 0) > 0,
  })
  const playerMinutes = stats?.games?.minutes || 0
  const playerGoals = stats?.goals?.total || 0
  const playerAssists = stats?.goals?.assists || 0
  const playerAppearances = normalizedAppearances(playerMinutes, stats?.games?.appearences ?? stats?.games?.appearances)
  const goalsPer90 = playerMinutes ? ((playerGoals * 90) / playerMinutes).toFixed(2) : "-"
  const assistsPer90 = playerMinutes ? ((playerAssists * 90) / playerMinutes).toFixed(2) : "-"
  const startRate = playerAppearances ? `${Math.round(((stats?.games?.lineups || 0) / playerAppearances) * 100)}%` : "-"

  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href={team ? `/teams/${team}?league=${league || ""}` : "/app"}>Back to team profile</Link>
        <header className="qe-panel mt-6 flex flex-col gap-5 rounded-3xl border p-6 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:p-8">
          {player.photo && <img alt="" className="h-24 w-24 rounded-full object-cover" src={player.photo} />}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Player profile</p>
            <h1 className="mt-2 text-4xl font-bold">{player.name}</h1>
            <p className="mt-2 text-slate-400">{player.nationality || "Nationality unavailable"}{player.age ? ` • Age ${player.age}` : ""}</p>
          </div>
        </header>

        <section className="mt-8 border-t border-slate-800 pt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Performance</p>
              <h2 className="mt-2 text-2xl font-bold">Season statistics</h2>
            </div>
            <span className="text-xs text-slate-500">{stats?.league?.name || "Competition"} / {dataSeason} baseline</span>
          </div>
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Quant Edge rating</p>
            <div className="mt-2 flex items-end gap-3"><p className="text-5xl font-bold text-white">{quantRating}</p><p className="pb-1 text-sm text-slate-400">/ 99</p></div>
            <p className="mt-2 text-sm text-slate-400">Dynamic estimate using recent performance, minutes, appearances, production, position, and availability.</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Position", stats?.games?.position],
              ["Appearances", stats?.games?.appearences ?? stats?.games?.appearances],
              ["Lineups", stats?.games?.lineups],
              ["Minutes", stats?.games?.minutes],
              ["Goals", stats?.goals?.total],
              ["Assists", stats?.goals?.assists],
              ["Key passes", stats?.passes?.key],
              ["Rating", stats?.games?.rating],
            ].map(([label, value]) => (
              <div className="qe-panel rounded-2xl border p-4" key={label}>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{display(value)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Player snapshot</p>
          <h2 className="mt-2 text-2xl font-bold">Role and contribution</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Goals / 90</p><p className="mt-2 text-2xl font-semibold text-cyan-200">{goalsPer90}</p><p className="mt-2 text-xs text-slate-400">scoring rate</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Assists / 90</p><p className="mt-2 text-2xl font-semibold text-cyan-200">{assistsPer90}</p><p className="mt-2 text-xs text-slate-400">creative output</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Start rate</p><p className="mt-2 text-2xl font-semibold text-lime-200">{startRate}</p><p className="mt-2 text-xs text-slate-400">of appearances</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Availability</p><p className="mt-2 text-2xl font-semibold text-white">{playerMinutes ? `${playerMinutes}m` : "-"}</p><p className="mt-2 text-xs text-slate-400">across {playerAppearances || "-"} appearances</p></div>
          </div>
        </section>

        <section className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Career history</p>
          <h2 className="mt-2 text-2xl font-bold">Season-by-season record</h2>
          <div className="mt-5 space-y-5">
            {careerHistory.length > 0 ? orderedCareerSeasons.map((seasonKey) => {
              const seasonStats = careerBySeason[seasonKey]
              return (
              <div className="qe-panel overflow-x-auto rounded-2xl border" key={seasonKey}>
                <div className="border-b border-slate-800 bg-slate-900 px-4 py-3"><h3 className="font-semibold text-cyan-200">{formatSeason(Number(seasonKey))} season</h3></div>
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-slate-900/60 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr><th className="px-4 py-3">Team</th><th className="px-4 py-3">Competition</th><th className="px-4 py-3">Apps</th><th className="px-4 py-3">Minutes</th><th className="px-4 py-3">Goals</th><th className="px-4 py-3">Assists</th><th className="px-4 py-3">Rating</th></tr>
                  </thead>
                  <tbody>
                    {seasonStats.map((careerStat, index) => (
                      <tr className="border-t border-slate-800" key={`${careerStat.season}-${careerStat.team?.name || "team"}-${index}`}>
                        <td className="px-4 py-3">{careerStat.team?.name || "-"}</td>
                        <td className="px-4 py-3 text-slate-400">{careerStat.league?.name || "-"}</td>
                        <td className="px-4 py-3">{careerStat.normalizedAppearances}</td>
                        <td className="px-4 py-3">{display(careerStat.games?.minutes)}</td>
                        <td className="px-4 py-3">{display(careerStat.goals?.total)}</td>
                        <td className="px-4 py-3">{display(careerStat.goals?.assists)}</td>
                        <td className="px-4 py-3 font-semibold text-lime-200">{careerStat.quantRating ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )
            }) : <p className="p-5 text-sm text-slate-400">Career history is unavailable for this player.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
