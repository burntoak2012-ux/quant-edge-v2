type Props = {
  homeTeam: string
  awayTeam: string
  signal: string
  confidence: number
  odds: string
  homeRating?: number
  awayRating?: number
}

export default function SignalCard({
  homeTeam,
  awayTeam,
  signal,
  confidence,
  odds,
  homeRating,
  awayRating,
}: Props) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 mb-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4">
        {homeTeam} vs {awayTeam}
      </h2>

      <div className="grid grid-cols-5 gap-4">
        <div>
          <p className="text-slate-400 text-sm">Signal</p>

          <p
            className={`font-bold ${
              signal === "STRONG BUY"
                ? "text-green-400"
                : signal === "BUY"
                ? "text-green-300"
                : signal === "WATCH"
                ? "text-yellow-300"
                : "text-red-400"
            }`}
          >
            {signal}
          </p>
        </div>

        <div>
          <p className="text-slate-400 text-sm">Confidence</p>
          <p>{confidence}%</p>
        </div>

        <div>
          <p className="text-slate-400 text-sm">Odds</p>
          <p>{odds}</p>
        </div>

        <div>
          <p className="text-slate-400 text-sm">Home Rating</p>
          <p>{homeRating ?? "-"}</p>
        </div>

        <div>
          <p className="text-slate-400 text-sm">Away Rating</p>
          <p>{awayRating ?? "-"}</p>
        </div>
      </div>
    </div>
  )
}
