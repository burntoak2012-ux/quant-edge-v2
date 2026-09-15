import { calculateQuantPlayerRating } from "./quantRating"

export type PlayerRatingContext = {
  position?: string
  form?: number
  minutes?: number
  appearances?: number
  goals?: number
  assists?: number
  tackles?: number
  interceptions?: number
  isStarter?: boolean
}

export const playerRatings: Record<string, number> = {
  "Senne Lammens": 85,
  "Altay Bayindir": 83,
  "Tom Heaton": 79,
  "Lisandro Martinez": 88,
  "Luke Shaw": 87,
  "Diogo Dalot": 86,
  "Kylian Mbappe": 90,
  "Rodri": 88,
  "Virgil van Dijk": 87,
  "Ederson": 88,
  "Reserve Player": 68,
  "Backup Mid": 64,
  "Backup Defender": 66,
  "Backup GK": 67,
  "Goalkeeper": 78,
  "Defender 1": 78,
  "Defender 2": 77,
  "Midfielder 1": 81,
  "Forward 1": 82,
}

export function getPlayerRating(
  name: string,
  context: PlayerRatingContext = {}
): number {
  return calculateQuantPlayerRating({
    baseRating: playerRatings[name] ?? 72,
    ...context,
  })
}