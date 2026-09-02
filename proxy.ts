import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabaseClient"

const PROTECTED_PREFIXES = ["/app", "/account", "/api/secure"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/stripe/webhook")) {
    return NextResponse.next()
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const { userId } = getAuth(req)
    if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url))

    try {
      if (!supabase) return NextResponse.redirect(new URL("/pricing", req.url))

      const { data, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .limit(1)

      if (error || data?.[0]?.status !== "active") {
        return NextResponse.redirect(new URL("/pricing", req.url))
      }
    } catch (error) {
      console.warn("Subscription check failed", error)
      return NextResponse.redirect(new URL("/pricing", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/app/:path*", "/account/:path*", "/api/secure/:path*"],
}
