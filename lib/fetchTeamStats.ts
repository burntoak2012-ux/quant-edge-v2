import axios from "axios"

const API_KEY = process.env.API_FOOTBALL_KEY

export async function fetchTeamStats(
  teamId: number,
  leagueId: number,
  season: number
) {
  try {
    console.log("FETCH TEAM STATS REQUEST", {
      teamId,
      leagueId,
      season,
    })

    const response = await axios.get(
      "https://v3.football.api-sports.io/teams/statistics",
      {
        headers: {
          "x-apisports-key": API_KEY || "",
        },
        params: {
          team: teamId,
          league: leagueId,
          season,
        },
      }
    )

    const stats = response.data.response

    console.log("FETCH TEAM STATS RESULT", {
      teamId,
      leagueId,
      season,
      team: stats?.team?.name,
      played: stats?.fixtures?.played?.total,
      wins: stats?.fixtures?.wins?.total,
      draws: stats?.fixtures?.draws?.total,
      losses: stats?.fixtures?.loses?.total,
      errors: response.data.errors,
    })

    return stats
  } catch (error) {
    console.error("TEAM STATS ERROR", {
      teamId,
      leagueId,
      season,
      error,
    })

    return null
  }
}
