"use client"

import { useUser, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { useEffect, useState } from "react"
import SignalCard from "@/components/SignalCard"
import { LEAGUES } from "@/lib/leagues"
import { LanguageSelector, useLanguage } from "@/components/LanguageProvider"
import BrandMark from "@/components/BrandMark"

type Match = {
  accessLevel: "free" | "pro"
  fixtureId: number
  kickoff: string | null
  status: string
  statusCode: string
  elapsed: number | null
  venue: string | null
  leagueLogo: string | null
  leagueId: number
  round: string | null
  leagueName: string
  homeTeamId: number
  homeTeam: string
  homeLogo: string | null
  awayTeamId: number
  awayTeam: string
  awayLogo: string | null
  homeGoals: number | null
  awayGoals: number | null
  signal: string
  confidence: number
  homeProbability: number
  drawProbability: number
  awayProbability: number
  odds: string | null
  oddsMarkets: Array<{ name: string; label: string; odds: string[] }>
  valuePercent: number | null
  valueLabel: string
  homeRating: number
  awayRating: number
  homeProjectedRating: number | null
  awayProjectedRating: number | null
  projectedLineups: Array<{ team: string; rating: number; formation: string | null; players: Array<{ name: string; photo: string | null; position: string; grid: string | null; rating: number | null }> }> | null
  hasLineups: boolean
  combinedLineupTotals?: { combinedTotal: number } | null
}

export default function Dashboard() {
  const { user } = useUser()
  const { t } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [updatedAt, setUpdatedAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))

  async function loadMatches() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/matches?date=${selectedDate}`, { cache: "no-store" })
      const contentType = res.headers.get("content-type") || ""
      const data = contentType.includes("application/json")
        ? await res.json()
        : { error: `Server returned HTTP ${res.status}` }

      if (!res.ok || !Array.isArray(data)) {
        throw new Error(data.error || "Match data is unavailable")
      }

      setMatches(data)
      setUpdatedAt(new Date().toLocaleTimeString())
    } catch (loadError) {
      console.error("Failed to load matches:", loadError)
      setError(loadError instanceof Error ? loadError.message : "Unable to load matches")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadMatches()
    }, 0)
    const interval = window.setInterval(() => {
      void loadMatches()
    }, 60_000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [selectedDate])

  function shiftDate(days: number) {
    const date = new Date(`${selectedDate}T12:00:00`)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().slice(0, 10))
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const visibleMatches = normalizedQuery
    ? matches.filter((match) =>
        `${match.homeTeam} ${match.awayTeam}`.toLowerCase().includes(normalizedQuery)
      )
    : matches
  const isFreePreview = matches[0]?.accessLevel === "free"

  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="qe-panel qe-reveal mb-8 rounded-3xl border p-5 shadow-2xl shadow-cyan-950/20 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3"><BrandMark compact /></div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300">Match intelligence</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{t.todayEdge}<span className="text-lime-300">.</span></h1>
            </div>

            <div className="flex items-center gap-3">
              <Link className="rounded-lg border border-cyan-400/50 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10" href="/pricing">
                Plans
              </Link>
              <Link className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400 hover:text-white" href="/account">
                Account
              </Link>
              <Link className="rounded-lg border border-lime-300/40 px-3 py-2 text-sm text-lime-200 hover:bg-lime-300/10" href="/performance">
                Performance
              </Link>
              <LanguageSelector />
              <UserButton />
            </div>
          </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="qe-panel rounded-2xl border p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signal</p>
              <p className="mt-2 text-xl font-semibold text-cyan-300">Live</p>
            </div>
            <div className="qe-panel rounded-2xl border p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.focus}</p>
              <p className="mt-2 text-xl font-semibold text-white">{visibleMatches.length || 0} {t.fixtures}</p>
            </div>
            <div className="qe-panel rounded-2xl border p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Welcome</p>
              <p className="mt-2 text-sm font-medium text-white">{user?.firstName || "Analyst"}</p>
            </div>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>{updatedAt ? `Updated ${updatedAt}` : "Fetching today&apos;s fixtures"}</span>
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <label className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300 focus-within:border-cyan-400 sm:w-80">
              <span className="sr-only">Search fixtures</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.searchFixtures}
                type="search"
                value={searchQuery}
              />
            </label>
            <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            <span>Live model feed</span>
            </div>
          </div>
        </div>

        <section className="mb-8 border-y border-cyan-100/10 py-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Competition hub</p>
              <h2 className="mt-2 text-2xl font-bold">{t.browseLeagues}</h2>
            </div>
            <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/leagues">View all</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LEAGUES.map((league) => (
              <Link className="qe-panel rounded-2xl border p-4" href={`/leagues/${league.id}`} key={league.id}>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{league.country}</p>
                <p className="mt-2 font-semibold text-white">{league.name}</p>
                <p className="mt-2 text-xs text-cyan-300">Standings &amp; fixtures &rarr;</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-8 border-b border-cyan-100/10 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Fixture calendar</p>
              <h2 className="mt-2 text-2xl font-bold">{t.chooseDate}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Previous date" className="h-10 w-10 border border-slate-700 text-lg text-slate-200 hover:border-cyan-300" onClick={() => shiftDate(-1)} type="button">&larr;</button>
              <input className="h-10 border border-slate-700 bg-slate-900 px-3 text-sm text-white" onChange={(event) => setSelectedDate(event.target.value)} type="date" value={selectedDate} />
              <button aria-label="Next date" className="h-10 w-10 border border-slate-700 text-lg text-slate-200 hover:border-cyan-300" onClick={() => shiftDate(1)} type="button">&rarr;</button>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">Showing fixtures scheduled for {new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], { dateStyle: "full" })}.</p>
        </section>

        <aside className="mb-8 border border-lime-300/20 bg-lime-300/5 p-4 text-sm text-slate-300">
          <p className="font-semibold text-lime-200">{t.decisionSupport}</p>
          <p className="mt-1">{t.decisionSupportCopy}</p>
        </aside>

        {isFreePreview && <aside className="mb-8 border border-cyan-300/30 bg-cyan-300/10 p-5 text-sm text-slate-200"><p className="font-semibold text-cyan-100">Free preview</p><p className="mt-1">You can explore two fixtures and core model context. Upgrade to Pro for full daily coverage, live statistics, team and player research, projected XIs, odds context, and performance tracking.</p><Link className="mt-4 inline-block rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-slate-950" href="/pricing">Unlock Pro</Link></aside>}

        {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">{t.loadingFixtures}</div>}
        {!loading && error && <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-amber-100"><p className="font-semibold">Match access unavailable</p><p className="mt-2 text-sm text-amber-200/80">{error}</p><div className="mt-5 flex flex-wrap gap-3"><Link className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" href="/pricing">View plans</Link><button className="rounded-lg border border-amber-300/50 px-4 py-2 text-sm" onClick={loadMatches}>Try again</button></div></div>}
        {!loading && !error && matches.length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8"><p className="font-semibold">{t.noFixtures}</p><p className="mt-2 text-sm text-slate-400">{t.checkBack}</p></div>}
        {!loading && !error && matches.length > 0 && visibleMatches.length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8"><p className="font-semibold">{t.noMatching}</p><p className="mt-2 text-sm text-slate-400">{t.tryDifferent}</p></div>}
        {!loading && !error && visibleMatches.length > 0 && <div className="grid gap-5">{visibleMatches.map((match) => <SignalCard key={match.fixtureId} {...match} combinedLineupTotal={match.combinedLineupTotals?.combinedTotal} />)}</div>}
      </div>
    </main>
  )
}
