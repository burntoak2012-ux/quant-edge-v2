import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireActiveSubscription } from "@/lib/requireSubscription"

const API_URL = "https://v3.football.api-sports.io"

type PlayerResponse = {
  response?: Array<{
    player?: { id?: number; name?: string; age?: number; nationality?: string; photo?: string }
    statistics?: Array<{
      league?: { name?: string }
      games?: { appearences?: number; appearances?: number; lineups?: number; minutes?: number; position?: string; rating?: string }
      goals?: { total?: number; assists?: number }
      passes?: { key?: number }
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

  const response = await fetch(`${API_URL}/players?id=${playerId}&season=${season}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  })
  const data = await response.json() as PlayerResponse
  const entry = data.response?.[0]
  const player = entry?.player
  const stats = entry?.statistics?.[0]
  if (!player?.name) notFound()

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
            <span className="text-xs text-slate-500">{stats?.league?.name || "Current competition"}</span>
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
