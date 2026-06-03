"use client"

import { useEffect, useState } from "react"
import SignalCard from "../components/SignalCard"

type Match = {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  signal: string
  confidence: number
  odds: string
  homeRating: number
  awayRating: number
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [updatedAt, setUpdatedAt] = useState("")

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch("/api/matches")
        const data = await res.json()

        setMatches(data)
        setUpdatedAt(new Date().toLocaleTimeString())
      } catch (error) {
        console.error("Failed to load matches:", error)
      }
    }

    loadMatches()
  }, [])

  console.log("MATCHES:", matches)

  console.log("MATCHES LENGTH:", matches.length)
console.log("FIRST MATCH:", matches[0])

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-5xl font-bold mb-3">
        Quant Edge
      </h1>

      <p className="text-gray-400 mb-8">
        Last Updated: {updatedAt || "Loading..."}
      </p>

      <div className="grid gap-6">
        {matches.map((match, index) => (
          <SignalCard
            key={`${match.fixtureId}-${index}`}
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