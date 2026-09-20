// Best-effort Flashscore lineup scraper fallback.
// Flashscore HTML structure may change; this helper tries a few heuristics.
export async function fetchFlashscoreLineups(
  homeName: string,
  awayName: string,
) {
  if (!homeName || !awayName) return []

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

  const buildNameVariants = (name: string) => {
    const base = name.trim()
    const normalized = normalize(base)
    const variants = new Set<string>([normalized, base.toLowerCase()])

    if (base.toLowerCase().includes("münchen") || base.toLowerCase().includes("munchen")) {
      variants.add(normalize(base.replace(/münchen/gi, "munich").replace(/munchen/gi, "munich")))
      variants.add(normalize(base.replace(/münchen/gi, "munchen").replace(/munchen/gi, "munich")))
    }

    if (base.toLowerCase().includes("munich") && !base.toLowerCase().includes("münchen")) {
      variants.add(normalize(base.replace(/munich/gi, "munchen")))
    }

    return [...variants].filter(Boolean)
  }

  const homeVariants = buildNameVariants(homeName)
  const awayVariants = buildNameVariants(awayName)
  const slugCandidates = new Set<string>()

  for (const homeVariant of homeVariants) {
    for (const awayVariant of awayVariants) {
      slugCandidates.add(`${homeVariant}-${awayVariant}`)
      slugCandidates.add(`${awayVariant}-${homeVariant}`)
      slugCandidates.add(`${homeVariant}${awayVariant}`)
      slugCandidates.add(`${awayVariant}${homeVariant}`)
      slugCandidates.add(`${homeVariant}--${awayVariant}`)
      slugCandidates.add(`${awayVariant}--${homeVariant}`)
    }
  }

  const uniqueSlugs = [...slugCandidates].filter(Boolean)

  for (const slug of uniqueSlugs) {
    const urls = [
      `https://www.flashscore.com/match/${slug}/#match-lineups`,
      `https://www.flashscore.com/match/${slug}/`,
      `https://m.flashscore.com/match/${slug}/`,
    ]

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; QuantEdgeBot/1.0)" },
          cache: "no-store",
        })

        if (!res.ok) continue

        const html = await res.text()

        // Heuristic: look for player name lists in the HTML
        // Common Flashscore markup includes participant names inside elements; we'll extract capitalized name groups
        const nameRegex = /([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g
        const matches = Array.from(new Set((html.match(nameRegex) || []).slice(0, 40)))

        if (matches.length >= 10) {
          // Split first 11 to home, next 11 to away as a best-effort
          const homePlayers = matches.slice(0, 11).map((n) => ({ player: { name: n } }))
          const awayPlayers = matches.slice(11, 22).map((n) => ({ player: { name: n } }))

          return [
            { team: { name: homeName }, startXI: homePlayers },
            { team: { name: awayName }, startXI: awayPlayers },
          ]
        }
      } catch (e) {
        console.warn("Flashscore fetch failed for", url, e)
      }
    }
  }

  return []
}
