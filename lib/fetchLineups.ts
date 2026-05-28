export async function fetchLineups(fixtureId: number) {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY || "",
        },
        cache: "no-store",
      }
    )

    const data = await res.json()

    console.log("LINEUPS:", fixtureId, data)

    if (!data.response || data.response.length < 2) {
      return null
    }

    return {
      home: data.response[0].startXI,
      away: data.response[1].startXI,
    }
  } catch (err) {
    console.log("LINEUP ERROR:", err)
    return null
  }
}