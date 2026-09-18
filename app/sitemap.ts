import type { MetadataRoute } from "next"
import { LEAGUES } from "@/lib/leagues"

const SITE_URL = "https://quantedgefootball.com"

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-")
}

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = ["", "/about", "/pricing", ...LEAGUES.map((league) => `/football/${slugify(league.name)}`)]

  return publicPages.map((path, index) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: index < 3 ? "weekly" : "daily",
    priority: index === 0 ? 1 : index < 3 ? 0.8 : 0.7,
  }))
}
