import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json([
    {
      fixtureId: 1,
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      signal: "HOME WIN",
      confidence: 82,
      odds: "1.95",
      homeRating: 88,
      awayRating: 79,
    },
  ])
}