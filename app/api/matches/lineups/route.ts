import { NextResponse } from "next/server"
import { fetchLineups } from "@/lib/fetchLineups"
import { calculateLineupRating } from "@/lib/calculateLineupRating"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const fixtureId = searchParams.get("fixtureId")

    if (!fixtureId) {
      return NextResponse.json(
        {
          error: "Missing fixtureId",
          example: "/api/matches/lineups?fixtureId=1535238",
        },
        { status: 400 }
      )
    }

    const lineups = await fetchLineups(Number(fixtureId))

    if (!lineups || lineups.length === 0) {
      return NextResponse.json({
        fixtureId: Number(fixtureId),
        count: 0,
        hasLineups: false,
        status: "NO LINEUPS YET",
        message:
          "Lineups are usually available 20-40 minutes before kickoff.",
        lineups: [],
      })
    }

    const ratedLineups = lineups.map((lineup: any) => {
      const rating = calculateLineupRating(lineup.startXI)

      return {
  team: lineup.team?.name,
  formation: lineup.formation,
  averageRating: rating.average,
  players: rating.players,
}
    })

    return NextResponse.json({
      fixtureId: Number(fixtureId),
      count: ratedLineups.length,
      hasLineups: true,
      lineups: ratedLineups,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Failed to fetch lineups" },
      { status: 500 }
    )
  }
}
