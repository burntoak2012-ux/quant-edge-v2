import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireActiveSubscription } from "@/lib/requireSubscription"
import { calculateQuantPlayerRating } from "@/lib/quantRating"

const API_URL = "https://v3.football.api-sports.io"

type PlayerResponse = {
  response?: Array<{
    player?: { id?: number; name?: string; age?: number; nationality?: string; photo?: string }
    statistics?: Array<{
      league?: { name?: string }
      games?: { appearences?: number; appearances?: number; lineups?: number; minutes?: number; position?: string; rating?: string }
      goals?: { total?: number; assists?: number }
      passes?: { key?: number }
      tackles?: { total?: number }
      interceptions?: number
    }>
  }>
}

function display(value?: number | string) {
  return value === undefined || value === null || value === "" ? "-" : value
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

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href={team ? `/teams/${team}?league=${league || ""}` : "/app"}>Back to team profile</Link>
        <header className="mt-6 flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:p-8">
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
          <div className="mt-5 border border-cyan-400/30 bg-cyan-400/5 p-5">
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
              <div className="border border-slate-800 bg-slate-900 p-4" key={label}>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{display(value)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
