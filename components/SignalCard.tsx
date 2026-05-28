type Props = {
  match: string
  signal: string
  confidence: string
  odds: string
}

export default function SignalCard({
  match,
  signal,
  confidence,
  odds,
}: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold">
        {match}
      </h2>

      <div className="mt-4 flex gap-6">
        <div>
          <p className="text-zinc-400 text-sm">
            Signal
          </p>

          <p
            className={
              signal === "BUY"
                ? "text-green-400 text-xl font-bold"
                : "text-red-400 text-xl font-bold"
            }
          >
            {signal}
          </p>
        </div>

        <div>
          <p className="text-zinc-400 text-sm">
            Confidence
          </p>

          <p className="text-xl">
            {confidence}
          </p>
        </div>

        <div>
          <p className="text-zinc-400 text-sm">
            Odds
          </p>

          <p className="text-xl">
            {odds}
          </p>
        </div>
      </div>
    </div>
  )
}