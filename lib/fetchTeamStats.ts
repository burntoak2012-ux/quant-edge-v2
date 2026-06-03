import axios from "axios"

const API_KEY = process.env.API_FOOTBALL_KEY

export async function fetchTeamStats(
  teamId: number,
  leagueId: number,
  season: number
) {
  try {
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

console.log(
  "TEAM STATS RAW",
  teamId,
  JSON.stringify(response.data, null, 2)
)

    return response.data.response
  } catch (error) {
    console.error("TEAM STATS ERROR", error)
    return null
  }
}
