import type { GoalImpact, RecentPlayerPerformance } from "./quantRating"

const API_URL = "https://v3.football.api-sports.io"

type Fixture = {
  fixture?: { id?: number; date?: string }
  teams?: { home?: { id?: number }; away?: { id?: number } }
}

type PlayerMatch = {
  player?: { id?: number }
  statistics?: Array<{
    games?: { minutes?: number; rating?: string; position?: string }
    goals?: { total?: number; assists?: number }
    shots?: { on?: number }
    passes?: { key?: number }
    tackles?: { total?: number }
    interceptions?: { total?: number } | number
  }>
}

type PlayerFixtureResponse = { response?: Array<{ players?: PlayerMatch[] }> }
type FixturesResponse = { response?: Fixture[] }
type Event = { time?: { elapsed?: number | null }; team?: { id?: number }; player?: { id?: number }; type?: string; detail?: string }
type EventsResponse = { response?: Event[] }

function goalImpacts(events: Event[], playerId: number, homeId: number, awayId: number): GoalImpact[] {
  let homeScore = 0
  let awayScore = 0
  const impacts: GoalImpact[] = []

  for (const event of events
    .filter((item) => item.type === "Goal" && item.detail !== "Missed Penalty" && item.detail !== "Own Goal")
    .sort((a, b) => (a.time?.elapsed || 0) - (b.time?.elapsed || 0))) {
    const team = event.team?.id === homeId ? "home" : event.team?.id === awayId ? "away" : null
    if (!team) continue
    if (event.player?.id === playerId) {
      impacts.push({
        minute: event.time?.elapsed || undefined,
        team,
        scoreBefore: { home: homeScore, away: awayScore },
      })
    }
    if (team === "home") homeScore += 1
    else awayScore += 1
  }

  return impacts
}

export async function fetchRecentPlayerPerformances(
  playerId: number,
  teamId: number,
  season: number,
  apiKey: string,
): Promise<RecentPlayerPerformance[]> {
  try {
    const fixtureResponse = await fetch(`${API_URL}/fixtures?team=${teamId}&season=${season}&status=FT`, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 21600 },
    })
    if (!fixtureResponse.ok) return []
    const fixtureData = await fixtureResponse.json() as FixturesResponse
    const fixtures = (fixtureData.response || [])
      .filter((fixture) => fixture.fixture?.id && fixture.fixture.date)
      .sort((a, b) => new Date(b.fixture?.date || 0).getTime() - new Date(a.fixture?.date || 0).getTime())
      .slice(0, 5)

    const performances = await Promise.all(fixtures.map(async (fixture) => {
      const fixtureId = fixture.fixture?.id
      if (!fixtureId) return null
      const [playerResponse, eventsResponse] = await Promise.all([
        fetch(`${API_URL}/fixtures/players?fixture=${fixtureId}&team=${teamId}`, {
          headers: { "x-apisports-key": apiKey },
          next: { revalidate: 21600 },
        }),
        fetch(`${API_URL}/fixtures/events?fixture=${fixtureId}`, {
          headers: { "x-apisports-key": apiKey },
          next: { revalidate: 21600 },
        }),
      ])
      if (!playerResponse.ok) return null
      const playerData = await playerResponse.json() as PlayerFixtureResponse
      const player = playerData.response?.[0]?.players?.find((entry) => entry.player?.id === playerId)
      const stats = player?.statistics?.[0]
      if (!stats) return null
      const interceptions = typeof stats.interceptions === "number" ? stats.interceptions : stats.interceptions?.total
      const eventsData = eventsResponse.ok ? await eventsResponse.json() as EventsResponse : { response: [] }
      const homeId = fixture.teams?.home?.id
      const awayId = fixture.teams?.away?.id

      return {
        position: stats.games?.position,
        providerRating: stats.games?.rating ? Number(stats.games.rating) : undefined,
        minutes: stats.games?.minutes,
        goals: stats.goals?.total,
        assists: stats.goals?.assists,
        tackles: stats.tackles?.total,
        interceptions,
        keyPasses: stats.passes?.key,
        shotsOnTarget: stats.shots?.on,
        goalImpacts: homeId && awayId ? goalImpacts(eventsData.response || [], playerId, homeId, awayId) : [],
      }
    }))
    return performances.filter((performance) => performance !== null) as RecentPlayerPerformance[]
  } catch (error) {
    console.warn("Recent player performances unavailable", { playerId, teamId, season, error })
    return []
  }
}
