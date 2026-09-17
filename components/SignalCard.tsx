"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/LanguageProvider"

type Props = {
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
  valuePercent: number | null
  valueLabel: string
  homeRating: number
  awayRating: number
  homeProjectedRating: number | null
  awayProjectedRating: number | null
  combinedLineupTotal?: number
}

export default function SignalCard({
  fixtureId,
  kickoff,
  status,
  statusCode,
  elapsed,
  venue,
  leagueLogo,
  leagueId,
  round,
  leagueName,
  homeTeamId,
  homeTeam,
  homeLogo,
  awayTeamId,
  awayTeam,
  awayLogo,
  homeGoals,
  awayGoals,
  signal,
  confidence,
  homeProbability,
  drawProbability,
  awayProbability,
  odds,
  valuePercent,
  valueLabel,
  homeRating,
  awayRating,
  homeProjectedRating,
  awayProjectedRating,
  combinedLineupTotal,
}: Props) {
  const router = useRouter()
  const { t } = useLanguage()
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

  const modelView = signal === "HOME WIN"
    ? "Home edge"
    : signal === "AWAY WIN"
      ? "Away edge"
      : signal === "DRAW"
        ? "Draw edge"
        : "No clear edge"

  return (
    <div
      aria-label={`Open match brief for ${homeTeam} versus ${awayTeam}`}
      className="qe-panel qe-reveal cursor-pointer rounded-3xl border p-6 shadow-xl shadow-black/20 sm:p-7"
      onClick={() => router.push(`/fixtures/${fixtureId}?home=${homeTeamId}&away=${awayTeamId}&league=${leagueId}&homeRating=${homeProjectedRating || homeRating}&awayRating=${awayProjectedRating || awayRating}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          router.push(`/fixtures/${fixtureId}?home=${homeTeamId}&away=${awayTeamId}&league=${leagueId}&homeRating=${homeProjectedRating || homeRating}&awayRating=${awayProjectedRating || awayRating}`)
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${["1H", "2H", "HT", "ET", "BT"].includes(statusCode) ? "bg-lime-300 shadow-[0_0_12px_rgba(199,243,107,0.9)]" : "bg-cyan-300"}`} /><p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">{leagueName}</p>{leagueLogo && <img alt="" className="ml-auto h-5 w-5 object-contain" src={leagueLogo} />}</div>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <Link className="min-w-0 hover:text-cyan-300" href={`/teams/${homeTeamId}?league=${leagueId}`} onClick={(event) => event.stopPropagation()}>{homeLogo && <img alt="" className="mx-auto mb-2 h-10 w-10 object-contain" src={homeLogo} />}<p className="truncate text-base font-bold sm:text-lg">{homeTeam}</p></Link>
            <div><p className="text-3xl font-bold tracking-wide text-white">{homeGoals ?? "-"}<span className="mx-2 text-slate-600">:</span>{awayGoals ?? "-"}</p><p className="mt-1 text-xs font-semibold text-cyan-200">{elapsed ? `${elapsed}'` : statusCode === "NS" ? "Scheduled" : status}</p></div>
            <Link className="min-w-0 hover:text-cyan-300" href={`/teams/${awayTeamId}?league=${leagueId}`} onClick={(event) => event.stopPropagation()}>{awayLogo && <img alt="" className="mx-auto mb-2 h-10 w-10 object-contain" src={awayLogo} />}<p className="truncate text-base font-bold sm:text-lg">{awayTeam}</p></Link>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">{kickoff ? new Date(kickoff).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Kickoff unavailable"}{round && <><span className="mx-2 text-slate-600">•</span>{round}</>}{venue && <><span className="mx-2 text-slate-600">•</span>{venue}</>}</p>
        </div>
        <button
          aria-expanded={showHelp}
          aria-label="Explain dashboard values"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-600 text-sm font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-400/10"
          onClick={(event) => {
            event.stopPropagation()
            setShowHelp((visible) => !visible)
          }}
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
            <li><strong className="text-white">Model view:</strong> an analytical lean based on the current ratings, not a tip or a guarantee.</li>
            <li><strong className="text-white">Probabilities:</strong> normalized home, draw, and away estimates from the rating model. They are model estimates, not guarantees.</li>
            <li><strong className="text-white">Team ratings:</strong> internal ratings shown on a 0 to 100 scale.</li>
            <li><strong className="text-white">Odds:</strong> the displayed decimal market odds from the first available bookmaker.</li>
            <li><strong className="text-white">Value:</strong> model probability minus the odds-implied probability. At least +5 points is potential value; at most -5 points is potentially overpriced.</li>
            <li><strong className="text-white">Lineup total:</strong> combined player rating when confirmed lineups are available.</li>
          </ul>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 border-y border-slate-800 py-5 sm:grid-cols-4 lg:grid-cols-7">
        <div>
          <p className="text-gray-400 text-xs">{t.decisionSupport}</p>
          <p className={`font-bold ${signalColor}`}>
            {modelView}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">{t.lineupTotal}</p>
          <p>{combinedLineupTotal ?? t.pending}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">Confidence</p>
          <p className={`font-bold ${confidenceColor}`}>
            {confidence}%
          </p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">Probability split</p>
          <div className="mt-2 flex h-1.5 overflow-hidden bg-slate-800"><span className="bg-cyan-300" style={{ width: `${homeProbability}%` }} /><span className="bg-slate-400" style={{ width: `${drawProbability}%` }} /><span className="bg-lime-300" style={{ width: `${awayProbability}%` }} /></div>
          <p className="mt-2 text-[10px] text-slate-500">H {homeProbability} / D {drawProbability} / A {awayProbability}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">{t.odds}</p>
          <p>{odds ?? t.unavailable}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">{t.marketContext}</p>
          <p className={`font-bold ${valuePercent === null ? "text-slate-400" : valuePercent >= 5 ? "text-green-400" : valuePercent <= -5 ? "text-red-400" : "text-yellow-400"}`}>
            {valueLabel}
          </p>
          {valuePercent !== null && <p className="text-xs text-slate-500">{valuePercent > 0 ? "+" : ""}{valuePercent} pts</p>}
        </div>

        <div>
          <p className="text-gray-400 text-xs">Home rating</p>
          <p className="font-semibold">{homeRating}</p>
          <p className="mt-1 text-xs text-lime-300">XI {homeProjectedRating ?? "Pending"}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs">Away rating</p>
          <p className="font-semibold">{awayRating}</p>
          <p className="mt-1 text-xs text-lime-300">XI {awayProjectedRating ?? "Pending"}</p>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        <span>Fixture #{fixtureId}</span>
        <span className="mx-2 text-slate-700">•</span>
        <span className="text-cyan-300">Open match brief</span>
        <span className="mx-2 text-slate-700">•</span>
        <span>Use this as research, not a betting instruction.</span>
      </div>
    </div>
  )
}
