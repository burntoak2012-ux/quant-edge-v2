import type { MetadataRoute } from "next"

const SITE_URL = "https://quantedgefootball.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/football/"],
      disallow: ["/app/", "/account/", "/api/", "/fixtures/", "/leagues/", "/players/", "/teams/", "/sign-in/", "/sign-up/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
