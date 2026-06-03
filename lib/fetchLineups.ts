const API_KEY = process.env.API_FOOTBALL_KEY

export async function fetchLineups(fixtureId: number) {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
      {
        headers: {
          "x-apisports-key": API_KEY || "",
        },
        cache: "no-store",
      }
    )

    const data = await res.json()

    if (data.errors?.rateLimit) {
  console.log("LINEUP RATE LIMITED")
  return []
}

    console.log("Lineups API Response:", data)

    return data.response || []
  } catch (error) {
    console.error("Lineups fetch error:", error)
    return []
  }
}
