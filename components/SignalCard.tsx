"use client"

type Props = {
  homeTeam: string
  awayTeam: string
  signal: string
  confidence: number
  odds: string
  homeRating: number
  awayRating: number
  combinedLineupTotal?: number
}

export default function SignalCard({
  homeTeam,
  awayTeam,
  signal,
  confidence,
  odds,
  homeRating,
  awayRating,
  combinedLineupTotal,
}: Props) {
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/20">
      <h2 className="text-2xl font-bold mb-5">
        {homeTeam} vs {awayTeam}
      </h2>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-7">
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
          <p>{odds}</p>
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
    </div>
  )
}
