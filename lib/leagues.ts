export const LEAGUES = [
  { id: 39, name: "Premier League", country: "England" },
  { id: 140, name: "La Liga", country: "Spain" },
  { id: 78, name: "Bundesliga", country: "Germany" },
  { id: 135, name: "Serie A", country: "Italy" },
  { id: 61, name: "Ligue 1", country: "France" },
  { id: 2, name: "Champions League", country: "UEFA" },
  { id: 3, name: "Europa League", country: "UEFA" },
  { id: 5, name: "UEFA Nations League", country: "UEFA" },
  { id: 848, name: "Conference League", country: "UEFA" },
  { id: 18, name: "AFC Champions League Two", country: "Asia" },
] as const

export const SUPPORTED_BASELINE_SEASON = 2024

export function getLeague(id: number) {
  return LEAGUES.find((league) => league.id === id)
}
