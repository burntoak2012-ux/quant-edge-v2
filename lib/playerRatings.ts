export type PlayerRatingContext = {
  position?: string
  form?: number
  minutes?: number
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const roleWeight = (position?: string) => {
  const normalized = (position || "MID").toUpperCase()

  if (normalized.includes("GK")) return 1.12
  if (normalized.includes("DEF")) return 1.04
  if (normalized.includes("MID")) return 1.1
  if (normalized.includes("FWD")) return 1.18

  return 1.06
}

export function getPlayerRating(
  name: string,
  context: PlayerRatingContext = {}
): number {
  const base = playerRatings[name] ?? 72
  const form = clamp(context.form ?? base, 55, 95)
  const minutes = Math.max(0, context.minutes ?? 1800)
  const starterBoost = context.isStarter ? 4.5 : context.isStarter === false ? -2.5 : 0
  const minutesBoost = Math.min(minutes / 2600, 1) * 3.5
  const weightedRole = roleWeight(context.position) * 10

  const score =
    base * 0.62 +
    form * 0.24 +
    weightedRole +
    minutesBoost +
    starterBoost

  return clamp(Math.round(score), 55, 94)
}