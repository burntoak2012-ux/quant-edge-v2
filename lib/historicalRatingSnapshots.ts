export type HistoricalRatingSnapshot = {
  fixtureId: number
  fixtureDate: string
  capturedAt: string
  sourceLabel: string
  sourceUrl: string
  lineups: Array<{
    team: string
    rating: number
    total: number
    formation: string
    isProjected: false
    players: Array<{
      name: string
      position: string
      rating: number
      photo: null
      grid: null
      number: null
    }>
  }>
}

const bournemouthLiverpool: HistoricalRatingSnapshot = {
  fixtureId: 1557407,
  fixtureDate: "2026-09-20",
  capturedAt: "2026-09-21",
  sourceLabel: "Manual Soccerwiki snapshot",
  sourceUrl: "https://soccerwiki.org/",
  lineups: [
    {
      team: "Bournemouth",
      rating: 88,
      total: 973,
      formation: "4-2-3-1",
      isProjected: false,
      players: [
        { name: "Djordje Petrovic", position: "GK", rating: 89, photo: null, grid: null, number: null },
        { name: "Adam Smith", position: "DEF", rating: 86, photo: null, grid: null, number: null },
        { name: "James Hill", position: "DEF", rating: 87, photo: null, grid: null, number: null },
        { name: "Antonio Silva", position: "DEF", rating: 89, photo: null, grid: null, number: null },
        { name: "Adrien Truffert", position: "DEF", rating: 90, photo: null, grid: null, number: null },
        { name: "Tyler Adams", position: "MID", rating: 89, photo: null, grid: null, number: null },
        { name: "Alex Scott", position: "MID", rating: 89, photo: null, grid: null, number: null },
        { name: "Vitor Rayan", position: "MID", rating: 88, photo: null, grid: null, number: null },
        { name: "Ryan Christie", position: "MID", rating: 88, photo: null, grid: null, number: null },
        { name: "Marcus Tavernier", position: "MID", rating: 89, photo: null, grid: null, number: null },
        { name: "Evanilson", position: "FWD", rating: 89, photo: null, grid: null, number: null },
      ],
    },
    {
      team: "Liverpool",
      rating: 92,
      total: 1012,
      formation: "4-2-3-1",
      isProjected: false,
      players: [
        { name: "Alisson Becker", position: "GK", rating: 93, photo: null, grid: null, number: null },
        { name: "Ronald Araujo", position: "DEF", rating: 91, photo: null, grid: null, number: null },
        { name: "Jeremy Jacquet", position: "DEF", rating: 87, photo: null, grid: null, number: null },
        { name: "Virgil van Dijk", position: "DEF", rating: 94, photo: null, grid: null, number: null },
        { name: "Milos Kerkez", position: "DEF", rating: 89, photo: null, grid: null, number: null },
        { name: "Dominik Szoboszlai", position: "MID", rating: 93, photo: null, grid: null, number: null },
        { name: "Alexis Mac Allister", position: "MID", rating: 93, photo: null, grid: null, number: null },
        { name: "Cody Gakpo", position: "MID", rating: 92, photo: null, grid: null, number: null },
        { name: "Florian Wirtz", position: "MID", rating: 94, photo: null, grid: null, number: null },
        { name: "Bradley Barcola", position: "MID", rating: 92, photo: null, grid: null, number: null },
        { name: "Alexander Isak", position: "FWD", rating: 94, photo: null, grid: null, number: null },
      ],
    },
  ],
}

const snapshots = new Map([[bournemouthLiverpool.fixtureId, bournemouthLiverpool]])

export function getHistoricalRatingSnapshot(fixtureId: number) {
  return snapshots.get(fixtureId) || null
}