import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const PROTECTED_PREFIXES = ["/app", "/account", "/leagues", "/teams", "/players", "/api/secure"]

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const { userId } = await auth()
    if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url))
  }
})

export const config = {
  matcher: [
    "/app/:path*",
    "/account/:path*",
    "/leagues/:path*",
    "/teams/:path*",
    "/players/:path*",
    "/api/secure/:path*",
    "/api/matches",
    "/api/stripe/create-session",
  ],
}
