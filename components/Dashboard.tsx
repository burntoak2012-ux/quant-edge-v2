"use client"

import { useEffect, useState } from "react"
import SignalCard from "@/components/SignalCard"

type Match = {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  signal: string
  confidence: number
  odds: string
  homeRating: number
  awayRating: number
  hasLineups: boolean
  combinedLineupTotals?: { combinedTotal: number } | null
}

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([])
  const [updatedAt, setUpdatedAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadMatches() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/matches", { cache: "no-store" })
      const data = await res.json()

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
    const timer = window.setTimeout(() => {
      void loadMatches()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Quant Edge / Match intelligence</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Today&apos;s edge</h1>
            <p className="mt-3 text-slate-400">Ratings, lineup impact, and model signals in one focused view.</p>
          </div>
          <div className="flex items-center gap-3">
            <a className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400" href="/pricing">Go Pro</a>
            <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200" onClick={loadMatches} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <div className="mb-6 flex items-center justify-between text-sm text-slate-500">
          <span>{updatedAt ? `Updated ${updatedAt}` : "Fetching today&apos;s fixtures"}</span>
          <span>{matches.length} matches</span>
        </div>

        {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading today&apos;s fixtures...</div>}
        {!loading && error && <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-amber-100"><p className="font-semibold">Data unavailable</p><p className="mt-2 text-sm text-amber-200/80">{error}</p><button className="mt-5 rounded-lg border border-amber-300/50 px-4 py-2 text-sm" onClick={loadMatches}>Try again</button></div>}
        {!loading && !error && matches.length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8"><p className="font-semibold">No fixtures available today</p><p className="mt-2 text-sm text-slate-400">Check back before kickoff when lineups and player ratings become available.</p></div>}
        {!loading && !error && matches.length > 0 && <div className="grid gap-5">{matches.map((match) => <SignalCard key={match.fixtureId} {...match} combinedLineupTotal={match.combinedLineupTotals?.combinedTotal} />)}</div>}
      </div>
    </main>
  )
}
