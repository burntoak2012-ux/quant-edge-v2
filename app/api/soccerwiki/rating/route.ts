import { NextResponse } from "next/server"
import { getPlayerRating } from "@/lib/playerRatings"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 })
    }

    const rating = getPlayerRating(name, {
      form: 72 + (name.length % 18),
      minutes: 1800,
      isStarter: true,
    })

    return NextResponse.json({ rating })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
