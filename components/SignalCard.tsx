"use client"

import { useState } from "react"
import Link from "next/link"
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
  oddsMarkets: Array<{ name: string; label: string; odds: string[] }>
  valuePercent: number | null
  valueLabel: string
  homeRating: number
  awayRating: number
  homeProjectedRating: number | null
  awayProjectedRating: number | null
  projectedLineups: Array<{ team: string; rating: number; formation: string | null; isProjected: boolean; players: Array<{ name: string; photo: string | null; position: string; grid: string | null; number: number | null; rating: number | null }> }> | null
  lineupStatus: "confirmed" | "projected" | "unavailable"
  outcomeValues: Array<{ outcome: string; modelProbability: number; impliedProbability: number | null; odd: number | null; value: number | null }>
  bestValueMarket: { market: string; outcome: string; odd: number | null; valuePercent: number } | null
  combinedLineupTotal?: number
  isWatchedHome?: boolean
  isWatchedAway?: boolean
  onToggleWatchlist?: (teamId: number, teamName: string) => void
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
  oddsMarkets,
  valuePercent,
  valueLabel,
  homeRating,
  awayRating,
  homeProjectedRating,
  awayProjectedRating,
  projectedLineups,
  lineupStatus,
  outcomeValues,
  bestValueMarket,
  combinedLineupTotal,
  isWatchedHome = false,
  isWatchedAway = false,
  onToggleWatchlist,
}: Props) {
  const { t } = useLanguage()
  const [showHelp, setShowHelp] = useState(false)
  const hasProjectedLineups = Boolean(projectedLineups && projectedLineups.length > 0)
  const [showLineup, setShowLineup] = useState(true)
  const lineupVisible = hasProjectedLineups ? true : showLineup

  function positionGroup(position: string) {
    const value = position.toLowerCase()
    if (value.includes("gk") || value.includes("goal")) return "goalkeeper"
    if (value.includes("def") || value.includes("back")) return "defender"
    if (value.includes("mid")) return "midfielder"
    if (value.includes("att") || value.includes("for") || value.includes("strik") || value.includes("wing")) return "forward"
    return "midfielder"
  }

  function toneForPosition(position: string | null) {
    const value = (position ?? "").toLowerCase()

    if (value.includes("gk")) {
      return "border-sky-300/80 bg-sky-200 text-slate-950"
    }

    if (value.includes("df") || value.includes("def")) {
      return "border-emerald-300/80 bg-emerald-200 text-slate-950"
    }

    if (value.includes("mf") || value.includes("mid")) {
      return "border-violet-300/80 bg-violet-200 text-slate-950"
    }

    if (value.includes("fw") || value.includes("for")) {
      return "border-amber-300/80 bg-amber-200 text-slate-950"
    }

    return "border-cyan-300/80 bg-cyan-200 text-slate-950"
  }

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

  const confidenceLabel =
    confidence >= 85 ? "High confidence" : confidence >= 75 ? "Medium confidence" : "Low confidence"

  const riskLabel =
    confidence >= 85 ? "Low variance" : confidence >= 75 ? "Moderate variance" : "High variance"

  const riskColor =
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

  const signalStrength =
    confidence >= 80 ? "Strong edge" : confidence >= 65 ? "Moderate edge" : "Balanced match"

  const lineupImpactHome = homeProjectedRating !== null ? homeProjectedRating - homeRating : null
  const lineupImpactAway = awayProjectedRating !== null ? awayProjectedRating - awayRating : null
  const lineupConfidence = lineupStatus === "confirmed"
    ? "Confirmed XI"
    : hasProjectedLineups ? "Projected XI" : "Projected XI pending"

  function buildAnalystSummary() {
    const ratingGap = Math.abs(homeRating - awayRating)

    if (signal === "HOME WIN") {
      if (ratingGap <= 3) {
        return `${homeTeam} carry the stronger current profile, but this is close enough that the first pressing phase and midfield control could decide the match.`
      }
      return `${homeTeam} hold the stronger rating profile and the model sees a clearer route to control, chance creation and sustained pressure.`
    }

    if (signal === "AWAY WIN") {
      if (ratingGap <= 3) {
        return `${awayTeam} are the narrow model favours, with the match likely turning on transitions and how effectively they attack the spaces behind the press.`
      }
      return `${awayTeam} have the stronger current profile and the model sees the edge in transition moments and second-phase attacks.`
    }

    if (ratingGap <= 3) {
      return `This looks unusually balanced. The match may come down to the midfield battle, late pressing triggers, and which side handles chaos better.`
    }

    return `The model sees a competitive fixture with a slight edge to the side controlling the middle third and the rhythm of possession.`
  }

  function buildTacticalBattle() {
    if (signal === "HOME WIN") {
      return `The key battle is likely the central midfield and the half-space entries: ${homeTeam} should be able to create cleaner sequences if they win that area early.`
    }

    if (signal === "AWAY WIN") {
      return `The decisive theme is transition control: ${awayTeam} look more dangerous when they attack the spaces behind the press and break the first line quickly.`
    }

    return `This should be shaped by midfield control and front-foot pressing. Whichever side wins the first duel in the middle will likely control the tempo.`
  }

  const matchCentrePills = [
    { label: modelView, tone: signal === "HOME WIN" ? "bg-emerald-400/10 text-emerald-200 border-emerald-400/30" : signal === "AWAY WIN" ? "bg-rose-400/10 text-rose-200 border-rose-400/30" : "bg-amber-400/10 text-amber-200 border-amber-400/30" },
    { label: `${confidence}% confidence`, tone: "bg-cyan-400/10 text-cyan-200 border-cyan-400/30" },
    { label: lineupConfidence, tone: "bg-lime-400/10 text-lime-200 border-lime-400/30" },
    { label: valueLabel, tone: valuePercent === null ? "bg-slate-700/40 text-slate-300 border-slate-600/40" : valuePercent >= 5 ? "bg-emerald-400/10 text-emerald-200 border-emerald-400/30" : valuePercent <= -5 ? "bg-red-400/10 text-red-200 border-red-400/30" : "bg-amber-400/10 text-amber-200 border-amber-400/30" },
  ]

  const homeControl = Math.min(94, Math.max(38, Math.round(homeProbability + (homeRating - awayRating) * 1.2)))
  const awayControl = Math.min(94, Math.max(38, Math.round(awayProbability + (awayRating - homeRating) * 1.2)))
  const pressingIntensity = Math.min(96, Math.max(34, Math.round((confidence + (homeRating + awayRating) / 2) / 2)))
  const transitionThreat = Math.min(96, Math.max(30, Math.round((homeProbability + awayProbability) / 2 + (Math.abs(homeRating - awayRating) * 0.9))))

  const formChips = [
    { label: "Control", value: homeControl },
    { label: "Transitions", value: transitionThreat },
    { label: "Pressing", value: pressingIntensity },
  ]

  const phaseBars = [
    { label: "Control", home: homeControl, away: awayControl },
    { label: "Pressing", home: Math.min(95, homeControl + 6), away: Math.min(95, awayControl + 7) },
    { label: "Transition", home: Math.min(95, transitionThreat), away: Math.min(95, transitionThreat - 5) },
  ]

  return (
    <div className="qe-panel qe-reveal rounded-3xl border p-6 shadow-xl shadow-black/20 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${["1H", "2H", "HT", "ET", "BT"].includes(statusCode) ? "bg-lime-300 shadow-[0_0_12px_rgba(199,243,107,0.9)]" : "bg-cyan-300"}`} /><p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">{leagueName}</p>{leagueLogo && <img alt="" className="ml-auto h-5 w-5 object-contain" src={leagueLogo} />}</div>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <Link className="min-w-0 hover:text-cyan-300" href={`/teams/${homeTeamId}?league=${leagueId}`}>{homeLogo && <img alt="" className="mx-auto mb-2 h-10 w-10 object-contain" src={homeLogo} />}<p className="truncate text-base font-bold sm:text-lg">{homeTeam}</p></Link>
            <div><p className="text-3xl font-bold tracking-wide text-white">{homeGoals ?? "-"}<span className="mx-2 text-slate-600">:</span>{awayGoals ?? "-"}</p><p className="mt-1 text-xs font-semibold text-cyan-200">{elapsed ? `${elapsed}'` : statusCode === "NS" ? "Scheduled" : status}</p></div>
            <Link className="min-w-0 hover:text-cyan-300" href={`/teams/${awayTeamId}?league=${leagueId}`}>{awayLogo && <img alt="" className="mx-auto mb-2 h-10 w-10 object-contain" src={awayLogo} />}<p className="truncate text-base font-bold sm:text-lg">{awayTeam}</p></Link>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">{kickoff ? new Date(kickoff).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Kickoff unavailable"}{round && <><span className="mx-2 text-slate-600">•</span>{round}</>}{venue && <><span className="mx-2 text-slate-600">•</span>{venue}</>}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {matchCentrePills.map((pill) => (
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${pill.tone}`} key={pill.label}>{pill.label}</span>
            ))}
          </div>
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

      <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/30 p-4 shadow-inner shadow-cyan-900/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Analyst read</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${confidenceColor} border-current/30 bg-current/5`}>
              {signalStrength}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${riskColor} border-current/30 bg-current/5`}>
              {riskLabel}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span className="text-cyan-200">Confidence {confidence}%</span>
          <span className="text-slate-600">•</span>
          <span>{confidenceLabel}</span>
          <span className="text-slate-600">•</span>
          <span className="text-lime-200">{lineupConfidence}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-200">{buildAnalystSummary()}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {formChips.map((chip) => (
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200" key={chip.label}>{chip.label} {chip.value}</span>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Key battle</p>
          <p className="mt-2 text-sm text-cyan-100">{buildTacticalBattle()}</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Match phases</p>
          <span className="text-[10px] text-slate-500">Model intensity</span>
        </div>
        <div className="space-y-3">
          {phaseBars.map((phase) => (
            <div className="space-y-1.5" key={phase.label}>
              <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                <span>{phase.label}</span>
                <span>{homeControl >= awayControl ? "Home edge" : "Away edge"}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(phase.home, 100)}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-slate-300">{phase.home}%</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.min(phase.away, 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Market value scan</p>
          {bestValueMarket && (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
              Best value: {bestValueMarket.outcome === "HOME WIN" ? homeTeam : bestValueMarket.outcome === "AWAY WIN" ? awayTeam : "Draw"} +{bestValueMarket.valuePercent} pts
            </span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {outcomeValues.map((entry) => {
            const label = entry.outcome === "HOME WIN" ? homeTeam : entry.outcome === "AWAY WIN" ? awayTeam : "Draw"
            const isBest = bestValueMarket?.outcome === entry.outcome
            return (
              <div className={`rounded-xl border p-3 ${isBest ? "border-emerald-400/50 bg-emerald-400/5" : "border-slate-800 bg-slate-900/60"}`} key={entry.outcome}>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-white">{entry.odd ? entry.odd.toFixed(2) : "-"}</p>
                <p className="mt-1 text-[10px] text-slate-500">Model {entry.modelProbability}% · Market {entry.impliedProbability ?? "-"}%</p>
                {entry.value !== null && <p className={`mt-1 text-[10px] font-semibold ${entry.value >= 5 ? "text-emerald-300" : entry.value <= -5 ? "text-red-300" : "text-slate-400"}`}>{entry.value > 0 ? "+" : ""}{entry.value} pts</p>}
              </div>
            )
          })}
        </div>
        {oddsMarkets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
            {oddsMarkets.map((market) => <span className="rounded-full border border-cyan-200/20 bg-cyan-200/5 px-3 py-1.5 text-xs text-cyan-100" key={market.name}>{market.label}: {market.odds.slice(0, 3).join(" · ")}</span>)}
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button className="rounded-full border border-lime-300/40 px-3 py-1.5 text-xs font-semibold text-lime-200 hover:bg-lime-300/10" onClick={(event) => { event.stopPropagation(); setShowLineup((visible) => !visible) }} type="button">
          {lineupVisible ? "Hide expected XI" : "View expected XI"}
        </button>
        <button
          className="rounded-full border border-cyan-300/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/10"
          onClick={(event) => {
            event.stopPropagation()
            if (onToggleWatchlist) {
              onToggleWatchlist(homeTeamId, homeTeam)
            }
          }}
          type="button"
        >
          {isWatchedHome ? `Unfollow ${homeTeam}` : `Follow ${homeTeam}`}
        </button>
        <button
          className="rounded-full border border-cyan-300/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/10"
          onClick={(event) => {
            event.stopPropagation()
            if (onToggleWatchlist) {
              onToggleWatchlist(awayTeamId, awayTeam)
            }
          }}
          type="button"
        >
          {isWatchedAway ? `Unfollow ${awayTeam}` : `Follow ${awayTeam}`}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 border-y border-slate-800 py-5 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t.decisionSupport}</p>
          <p className={`mt-2 font-bold ${signalColor}`}>
            {modelView}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t.lineupTotal}</p>
          <p className="mt-2 font-semibold text-white">{combinedLineupTotal ?? t.pending}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Projected XI</p>
          <p className="mt-2 font-semibold text-lime-200">{lineupConfidence}</p>
          <p className="mt-1 text-[10px] text-slate-400">
            {lineupImpactHome !== null && lineupImpactAway !== null
              ? `Δ ${lineupImpactHome > 0 ? "+" : ""}${lineupImpactHome} / ${lineupImpactAway > 0 ? "+" : ""}${lineupImpactAway}`
              : "Waiting on data"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Confidence</p>
          <p className={`mt-2 font-bold ${confidenceColor}`}>
            {confidence}%
          </p>
          <p className="mt-1 text-[10px] text-slate-400">{confidenceLabel}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Risk</p>
          <p className={`mt-2 font-bold ${riskColor}`}>
            {riskLabel}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Probability split</p>
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-800"><span className="bg-cyan-300" style={{ width: `${homeProbability}%` }} /><span className="bg-slate-400" style={{ width: `${drawProbability}%` }} /><span className="bg-lime-300" style={{ width: `${awayProbability}%` }} /></div>
          <p className="mt-2 text-[10px] text-slate-500">H {homeProbability} / D {drawProbability} / A {awayProbability}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t.odds}</p>
          <p className="mt-2 font-semibold text-white">{odds ?? t.unavailable}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t.marketContext}</p>
          <p className={`mt-2 font-bold ${valuePercent === null ? "text-slate-400" : valuePercent >= 5 ? "text-green-400" : valuePercent <= -5 ? "text-red-400" : "text-yellow-400"}`}>
            {valueLabel}
          </p>
          {valuePercent !== null && <p className="mt-1 text-[10px] text-slate-500">{valuePercent > 0 ? "+" : ""}{valuePercent} pts</p>}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Home rating</p>
          <p className="mt-2 font-semibold text-white">{homeRating}</p>
          <p className="mt-1 text-[10px] text-lime-300">XI {homeProjectedRating ?? "Pending"}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Away rating</p>
          <p className="mt-2 font-semibold text-white">{awayRating}</p>
          <p className="mt-1 text-[10px] text-lime-300">XI {awayProjectedRating ?? "Pending"}</p>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        <span>Fixture #{fixtureId}</span>
        <span className="mx-2 text-slate-700">•</span>
        <span>Use this as research, not a betting instruction.</span>
      </div>
      {lineupVisible && <div className="mb-5 border-y border-slate-800 py-5">
        {projectedLineups?.length ? <div className="grid gap-5 lg:grid-cols-2">{projectedLineups.map((lineup) => {
          const isHome = lineup.team === homeTeam
          const kitTone = isHome
            ? "border-cyan-200/70 bg-gradient-to-b from-cyan-400 to-cyan-600 text-slate-950"
            : "border-amber-200/70 bg-gradient-to-b from-amber-400 to-orange-600 text-slate-950"
          const pitchPlayers = lineup.players.slice(0, 11).map((player) => ({
            ...player,
            tone: toneForPosition(player.position),
            group: positionGroup(player.position),
          }))
          const rows = (["forward", "midfielder", "defender", "goalkeeper"] as const)
            .map((group) => ({ group, players: pitchPlayers.filter((player) => player.group === group) }))
            .filter((row) => row.players.length > 0)

          return <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3" key={lineup.team}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{lineup.team}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">{lineup.formation || "Formation unavailable"}{lineup.isProjected && <span className="ml-2 text-amber-300">Projected</span>}</p>
              </div>
              <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-200">XI {lineup.rating}</span>
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-emerald-200/25 bg-gradient-to-b from-[#1e8a5c] via-[#187249] to-[#0d3f28] shadow-inner shadow-black/30">
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 12.5%, transparent 12.5%, transparent 25%)" }} />
              <div className="absolute inset-[4%] rounded-sm border border-white/35" />
              <div className="absolute inset-x-[4%] top-1/2 h-px bg-white/35" />
              <div className="absolute left-1/2 top-1/2 h-[16%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
              <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
              <div className="absolute left-1/2 top-[4%] h-[14%] w-[42%] -translate-x-1/2 border border-t-0 border-white/35" />
              <div className="absolute left-1/2 top-[4%] h-[6%] w-[18%] -translate-x-1/2 border border-t-0 border-white/35" />
              <div className="absolute bottom-[4%] left-1/2 h-[14%] w-[42%] -translate-x-1/2 border border-b-0 border-white/35" />
              <div className="absolute bottom-[4%] left-1/2 h-[6%] w-[18%] -translate-x-1/2 border border-b-0 border-white/35" />

              <div className="relative z-10 flex h-full flex-col justify-around py-4">
                {rows.map((row) => (
                  <div className="flex justify-evenly px-2" key={row.group}>
                    {row.players.map((player, index) => (
                      <div className="flex flex-col items-center gap-1" key={`${player.name}-${index}`}>
                        <span className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 text-xs font-bold shadow-md shadow-black/50 ${kitTone}`}>
                          {player.number ?? player.position.slice(0, 1)}
                        </span>
                        <span className="max-w-[70px] truncate rounded bg-slate-950/80 px-1 text-[9px] font-semibold leading-4 text-white">{player.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-slate-200">
              {pitchPlayers.map((player, index) => <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1" key={`${player.name}-list-${index}`}><span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${player.tone}`}>{player.position}</span><span className="truncate font-medium text-slate-100">{player.name}</span></div>)}
            </div>
          </div>
        })}</div> : <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100"><p className="font-semibold text-amber-200">No lineup data available yet</p><p className="mt-1 text-amber-50/80">This normally appears when the provider publishes confirmed team sheets. For older fixtures, no XI data may be available from the source.</p></div>}
      </div>}
    </div>
  )
}
