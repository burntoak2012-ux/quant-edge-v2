import axios from "axios"

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
}

export async function fetchMatchOdds(fixtureId: number): Promise<MatchOdds | null> {
  if (!API_KEY) return null

  try {
    const response = await axios.get<OddsResponse>(
      "https://v3.football.api-sports.io/odds",
      {
        headers: { "x-apisports-key": API_KEY },
        params: { fixture: fixtureId },
      }
    )

    const bookmaker = response.data.response?.[0]?.bookmakers?.[0]
    const market = bookmaker?.bets?.find((bet) => bet.name === "Match Winner")
    const values = market?.values || []
    const getOdd = (name: string) => {
      const odd = values.find((entry) => entry.value === name)?.odd
      const parsed = odd ? Number.parseFloat(odd) : NaN
      return Number.isFinite(parsed) && parsed > 1 ? parsed : null
    }

    const odds = { home: getOdd("Home"), draw: getOdd("Draw"), away: getOdd("Away") }
    return odds.home || odds.draw || odds.away ? odds : null
  } catch (error) {
    console.error("MATCH ODDS ERROR", { fixtureId, error })
    return null
  }
}
