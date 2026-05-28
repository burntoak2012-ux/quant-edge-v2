import SignalCard from "@/components/SignalCard"

export default function Home() {
  const signals = [
    {
      match: "Arsenal vs Chelsea",
      signal: "BUY",
      confidence: "82%",
      odds: "2.10",
    },
    {
      match: "Barcelona vs Madrid",
      signal: "SELL",
      confidence: "71%",
      odds: "1.88",
    },
    {
      match: "Inter vs Milan",
      signal: "BUY",
      confidence: "91%",
      odds: "2.45",
    },
  ]

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-5xl font-bold mb-10">
        Quant Edge
      </h1>

      <div className="grid gap-6">
        {signals.map((item, index) => (
          <SignalCard
            key={index}
            match={item.match}
            signal={item.signal}
            confidence={item.confidence}
            odds={item.odds}
          />
        ))}
      </div>
    </main>
  )
}