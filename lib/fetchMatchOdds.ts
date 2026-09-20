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

const TRACKED_MARKETS = [
  { name: "Goals Over/Under", label: "Total goals" },
  { name: "Both Teams Score", label: "Both teams score" },
  { name: "Double Chance", label: "Double chance" },
  { name: "Corners Over/Under", label: "Corners" },
  { name: "Cards Over/Under", label: "Cards" },
]

function parseOdd(value?: string) {
  const parsed = value ? Number.parseFloat(value) : NaN
  return Number.isFinite(parsed) && parsed > 1 ? parsed : null
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
    const bookmakers = data.response?.[0]?.bookmakers || []
    const allBets = bookmakers.flatMap((bookmaker) => bookmaker.bets || [])

    // Best (highest) price per selection across every bookmaker, so the analysis reflects the best odds available rather than a single provider.
    function bestOddsForMarket(marketName: string) {
      const best = new Map<string, number>()
      for (const bet of allBets) {
        if (bet.name !== marketName) continue
        for (const entry of bet.values || []) {
          const label = entry.value?.trim()
          const odd = parseOdd(entry.odd)
          if (!label || odd === null) continue
          const current = best.get(label)
          if (current === undefined || odd > current) best.set(label, odd)
        }
      }
      return best
    }

    const matchWinner = bestOddsForMarket("Match Winner")
    const homeOdd = matchWinner.get("Home") ?? null
    const drawOdd = matchWinner.get("Draw") ?? null
    const awayOdd = matchWinner.get("Away") ?? null

    const markets = TRACKED_MARKETS.flatMap(({ name, label }) => {
      const best = bestOddsForMarket(name)
      if (best.size === 0) return []
      const odds = Array.from(best.entries()).map(([value, odd]) => `${value} ${odd.toFixed(2)}`)
      return [{ name, label, odds }]
    })

    const odds = { home: homeOdd, draw: drawOdd, away: awayOdd, markets }
    return odds.home || odds.draw || odds.away || markets.length ? odds : null
  } catch (error) {
    console.error("MATCH ODDS ERROR", { fixtureId, error })
    return null
  }
}
