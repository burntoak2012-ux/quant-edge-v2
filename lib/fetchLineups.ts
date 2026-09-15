const API_KEY = process.env.API_FOOTBALL_KEY

import { fetchFlashscoreLineups } from "./fetchFlashscore"

export async function fetchLineups(fixtureId: number, opts?: { home?: string; away?: string; date?: string }) {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
      {
        headers: {
          "x-apisports-key": API_KEY || "",
        },
        next: { revalidate: 900 },
      }
    )

    const data = await res.json()

    if (data.errors?.rateLimit) {
  console.log("LINEUP RATE LIMITED")
  return []
}

    console.log("Lineups API Response:", data)
    const resp = data.response || []

    if ((!resp || resp.length === 0) && opts?.home && opts?.away) {
      console.log("No lineups from API, trying Flashscore fallback")
      const fs = await fetchFlashscoreLineups(opts.home, opts.away)
      if (fs && fs.length > 0) return fs
    }

    return resp
  } catch (error) {
    console.error("Lineups fetch error:", error)
    return []
  }
}
