import { NextResponse } from "next/server"
import { fetchLineups } from "@/lib/fetchLineups"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const fixtureId = searchParams.get("fixtureId")

  if (!fixtureId) {
    return NextResponse.json(
      { error: "Missing fixtureId" },
      { status: 400 }
    )
  }

  const lineups = await fetchLineups(Number(fixtureId))

  return NextResponse.json(lineups)
}
