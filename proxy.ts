import { clerkMiddleware } from "@clerk/nextjs/server"

const PROTECTED_PREFIXES = ["/app", "/account", "/api/secure"]

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const { userId } = await auth()
    if (!userId) return Response.redirect(new URL("/sign-in", req.url))
  }
})

export const config = {
  matcher: [
    "/app/:path*",
    "/account/:path*",
    "/api/secure/:path*",
    "/api/matches",
    "/api/stripe/create-session",
  ],
}
