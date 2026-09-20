import Link from "next/link"

type Props = {
  kickoff: string | null
  status: string
  statusCode: string
  elapsed: number | null
  homeTeam: string
  homeLogo: string | null
  awayTeam: string
  awayLogo: string | null
  homeGoals: number | null
  awayGoals: number | null
  signal: string
}

export default function MiniMatchCard({
  kickoff,
  status,
  statusCode,
  elapsed,
  homeTeam,
  homeLogo,
  awayTeam,
  awayLogo,
  homeGoals,
  awayGoals,
  signal,
}: Props) {
  const modelView = signal === "HOME WIN"
    ? "Home edge"
    : signal === "AWAY WIN"
      ? "Away edge"
      : signal === "DRAW"
        ? "Draw edge"
        : "No clear edge"
  const isLive = ["1H", "2H", "HT", "ET", "BT"].includes(statusCode)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-3 text-center">
        <div className="min-w-0 flex-1">
          {homeLogo && <img alt="" className="mx-auto mb-1 h-7 w-7 object-contain" src={homeLogo} />}
          <p className="truncate text-sm font-semibold text-white">{homeTeam}</p>
        </div>
        <div className="shrink-0 px-2">
          <p className="text-lg font-bold text-white">{homeGoals ?? "-"}<span className="mx-1 text-slate-600">:</span>{awayGoals ?? "-"}</p>
          <p className="mt-1 text-[10px] font-semibold text-cyan-200">{isLive ? `${elapsed}'` : statusCode === "NS" ? (kickoff ? new Date(kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Scheduled") : status}</p>
        </div>
        <div className="min-w-0 flex-1">
          {awayLogo && <img alt="" className="mx-auto mb-1 h-7 w-7 object-contain" src={awayLogo} />}
          <p className="truncate text-sm font-semibold text-white">{awayTeam}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">{modelView}</span>
      </div>
      <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-center">
        <p className="text-xs text-slate-300">Unlock projected lineups, market value scan, and full match analysis.</p>
        <Link className="mt-2 inline-block rounded-full bg-lime-300 px-3 py-1.5 text-xs font-semibold text-slate-950" href="/pricing">Unlock Pro</Link>
      </div>
    </div>
  )
}
