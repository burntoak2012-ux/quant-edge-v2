import Link from "next/link"
import { redirect } from "next/navigation"
import { requireActiveSubscription } from "@/lib/requireSubscription"
import { LEAGUES, SUPPORTED_BASELINE_SEASON } from "@/lib/leagues"

export default async function LeaguesPage() {
  const access = await requireActiveSubscription()
  if (!access.ok) redirect(access.status === 401 ? "/sign-in" : "/pricing")

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/app">Back to dashboard</Link>
        <header className="mt-6 border-b border-slate-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Competition directory</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Leagues</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Open a competition to browse its standings, full fixture list, and team profiles.</p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEAGUES.map((league) => (
            <Link className="border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400/70 hover:bg-slate-900/80" href={`/leagues/${league.id}`} key={league.id}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{league.country}</p>
              <h2 className="mt-3 text-xl font-bold">{league.name}</h2>
              <p className="mt-4 text-sm text-slate-500">Standings and {SUPPORTED_BASELINE_SEASON} fixtures</p>
              <span className="mt-6 inline-block text-sm font-semibold text-cyan-300">Open league &rarr;</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
