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
  homeRating?: number
  awayRating?: number
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])

  useEffect(() => {
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => {
        setMatches(data)
      })
  }, [])

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-5xl font-bold mb-10">Quant Edge</h1>

      <div className="space-y-6">
        {matches.map((match) => (
          <SignalCard
            key={match.fixtureId}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            signal={match.signal}
            confidence={match.confidence}
            odds={match.odds}
            homeRating={match.homeRating}
            awayRating={match.awayRating}
          />
        ))}
      </div>
    </main>
  )
}