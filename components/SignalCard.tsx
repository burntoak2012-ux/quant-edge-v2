"use client"

import { useState } from "react"
import Link from "next/link"

type Props = {
  fixtureId: number
  kickoff: string | null
  status: string
  leagueId: number
  round: string | null
  leagueName: string
  homeTeamId: number
  homeTeam: string
  awayTeamId: number
  awayTeam: string
  signal: string
  confidence: number
  odds: string | null
  valuePercent: number | null
  valueLabel: string
  homeRating: number
  awayRating: number
  combinedLineupTotal?: number
}

export default function SignalCard({
  fixtureId,
  kickoff,
  status,
  leagueId,
  round,
  leagueName,
  homeTeamId,
  homeTeam,
  awayTeamId,
  awayTeam,
  signal,
  confidence,
  odds,
  valuePercent,
  valueLabel,
  homeRating,
  awayRating,
  combinedLineupTotal,
}: Props) {
  const [showHelp, setShowHelp] = useState(false)
  const signalColor =
    signal === "HOME WIN"
      ? "text-green-400"
      : signal === "AWAY WIN"
      ? "text-red-400"
      : signal === "WAITING"
      ? "text-yellow-400"
      : "text-orange-400"

  const confidenceColor =
    confidence >= 85
      ? "text-green-400"
      : confidence >= 75
      ? "text-yellow-400"
      : "text-orange-400"

  return (
    <div className="qe-panel qe-reveal rounded-3xl border p-6 shadow-xl shadow-black/20 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">{leagueName}</p>
          <h2 className="text-2xl font-bold">
            <Link className="hover:text-cyan-300" href={`/teams/${homeTeamId}?league=${leagueId}`}>{homeTeam}</Link>
            <span className="text-slate-500"> vs </span>
            <Link className="hover:text-cyan-300" href={`/teams/${awayTeamId}?league=${leagueId}`}>{awayTeam}</Link>
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            {kickoff ? new Date(kickoff).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Kickoff unavailable"}
            <span className="mx-2 text-slate-600">•</span>
            {status}
            {round && <><span className="mx-2 text-slate-600">•</span>{round}</>}
          </p>
        </div>
        <button
          aria-expanded={showHelp}
          aria-label="Explain dashboard values"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-600 text-sm font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-400/10"
          onClick={() => setShowHelp((visible) => !visible)}
          title="Explain dashboard values"
          type="button"
        >
          ?
        </button>
      </div>

      {showHelp && (
        <div className="mb-5 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4 text-sm text-slate-300">
          <p className="font-semibold text-cyan-200">How to read these values</p>
          <ul className="mt-2 space-y-1.5">
            <li><strong className="text-white">Signal:</strong> HOME WIN or AWAY WIN means the rating gap is at least 5 points; PASS means the edge is smaller.</li>
            <li><strong className="text-white">Confidence / Win Probability:</strong> 50% for PASS, otherwise 55% to 95% based on the rating gap. This is a model estimate, not a guarantee.</li>
            <li><strong className="text-white">Team ratings:</strong> internal ratings shown on a 0 to 100 scale.</li>
            <li><strong className="text-white">Odds:</strong> the displayed decimal market odds from the first available bookmaker.</li>
            <li><strong className="text-white">Value:</strong> model probability minus the odds-implied probability. At least +5 points is potential value; at most -5 points is potentially overpriced.</li>
            <li><strong className="text-white">Lineup total:</strong> combined player rating when confirmed lineups are available.</li>
          </ul>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-7">
        <div>
          <p className="text-gray-400 text-xs">Signal</p>
          <p className={`font-bold ${signalColor}`}>
            {signal}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Lineup total</p>
          <p>{combinedLineupTotal ?? "Pending"}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">Confidence</p>
          <p className={`font-bold ${confidenceColor}`}>
            {confidence}%
          </p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">
            Win Probability
          </p>
          <p>{confidence}%</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">Odds</p>
          <p>{odds ?? "Unavailable"}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">Market view</p>
          <p className={`font-bold ${valuePercent === null ? "text-slate-400" : valuePercent >= 5 ? "text-green-400" : valuePercent <= -5 ? "text-red-400" : "text-yellow-400"}`}>
            {valueLabel}
          </p>
          {valuePercent !== null && <p className="text-xs text-slate-500">{valuePercent > 0 ? "+" : ""}{valuePercent} pts</p>}
        </div>

        <div>
          <p className="text-gray-400 text-xs">
            Home Rating
          </p>
          <p>{homeRating}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">
            Away Rating
          </p>
          <p>{awayRating}</p>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        <span>Fixture #{fixtureId}</span>
      </div>
    </div>
  )
}
