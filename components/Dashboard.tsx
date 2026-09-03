"use client"

import { useUser, UserButton } from "@clerk/nextjs"
import Link from "next/link"
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
  const { user } = useUser()
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
        <header className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300">Quant Edge / Match intelligence</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Today&apos;s edge</h1>
            </div>

            <div className="flex items-center gap-3">
              <Link className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400 hover:text-white" href="/account">
                Account
              </Link>
              <UserButton />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signal</p>
              <p className="mt-2 text-xl font-semibold text-cyan-300">Live</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Focus</p>
              <p className="mt-2 text-xl font-semibold text-white">{matches.length || 0} fixtures</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Welcome</p>
              <p className="mt-2 text-sm font-medium text-white">{user?.firstName || "Analyst"}</p>
            </div>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>{updatedAt ? `Updated ${updatedAt}` : "Fetching today&apos;s fixtures"}</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            <span>Live model feed</span>
          </div>
        </div>

        {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading today&apos;s fixtures...</div>}
        {!loading && error && <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-amber-100"><p className="font-semibold">Data unavailable</p><p className="mt-2 text-sm text-amber-200/80">{error}</p><button className="mt-5 rounded-lg border border-amber-300/50 px-4 py-2 text-sm" onClick={loadMatches}>Try again</button></div>}
        {!loading && !error && matches.length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8"><p className="font-semibold">No fixtures available today</p><p className="mt-2 text-sm text-slate-400">Check back before kickoff when lineups and player ratings become available.</p></div>}
        {!loading && !error && matches.length > 0 && <div className="grid gap-5">{matches.map((match) => <SignalCard key={match.fixtureId} {...match} combinedLineupTotal={match.combinedLineupTotals?.combinedTotal} />)}</div>}
      </div>
    </main>
  )
}
