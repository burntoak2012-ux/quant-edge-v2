// Lower rank = higher priority. Ordered roughly by UEFA country/competition coefficient standing.
const LEAGUE_IMPORTANCE: Record<number, number> = {
  2: 1,   // UEFA Champions League
  39: 2,  // Premier League (England)
  135: 3, // Serie A (Italy)
  78: 4,  // Bundesliga (Germany)
  140: 5, // La Liga (Spain)
  3: 6,   // UEFA Europa League
  61: 7,  // Ligue 1 (France)
  5: 8,   // UEFA Nations League
  848: 9, // UEFA Conference League
  18: 10, // AFC Champions League Two
}

export function getLeagueImportance(leagueId: number) {
  return LEAGUE_IMPORTANCE[leagueId] ?? 99
}
