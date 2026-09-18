const API_KEY = process.env.API_FOOTBALL_KEY

type OddsValue = {
  value?: string
  odd?: string
}

type OddsResponse = {
  response?: Array<{
    bookmakers?: Array<{
      bets?: Array<{
        name?: string
        values?: OddsValue[]
      }>
    }>
  }>
}

export type MatchOdds = {
  home: number | null
  draw: number | null
  away: number | null
  markets: Array<{ name: string; label: string; odds: string[] }>
}

export async function fetchMatchOdds(fixtureId: number): Promise<MatchOdds | null> {
  if (!API_KEY) return null

  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/odds?fixture=${fixtureId}`,
      {
        headers: { "x-apisports-key": API_KEY },
        next: { revalidate: 900 },
      },
    )
    if (!response.ok) return null

    const data = await response.json() as OddsResponse
    const bookmaker = data.response?.[0]?.bookmakers?.[0]
    const bets = bookmaker?.bets || []
    const market = bets.find((bet) => bet.name === "Match Winner")
    const values = market?.values || []
    const getOdd = (name: string) => {
      const odd = values.find((entry) => entry.value === name)?.odd
      const parsed = odd ? Number.parseFloat(odd) : NaN
      return Number.isFinite(parsed) && parsed > 1 ? parsed : null
    }

    const additionalMarkets = [
      { name: "Goals Over/Under", label: "Total goals" },
      { name: "Corners Over/Under", label: "Corners" },
      { name: "Cards Over/Under", label: "Cards" },
      { name: "Both Teams Score", label: "Both teams score" },
    ]
    const markets = additionalMarkets.flatMap(({ name, label }) => {
      const values = bets.find((bet) => bet.name === name)?.values || []
      return values.length ? [{ name, label, odds: values.map((entry) => `${entry.value || ""} ${entry.odd || ""}`.trim()) }] : []
    })
    const odds = { home: getOdd("Home"), draw: getOdd("Draw"), away: getOdd("Away"), markets }
    return odds.home || odds.draw || odds.away || markets.length ? odds : null
  } catch (error) {
    console.error("MATCH ODDS ERROR", { fixtureId, error })
    return null
  }
}
