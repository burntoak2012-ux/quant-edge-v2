import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabaseClient"

export async function requireActiveSubscription() {
  const { userId } = await auth()

  if (!userId) return { ok: false as const, status: 401, error: "Sign in required" }
  if (!supabase) return { ok: false as const, status: 503, error: "Billing is not configured" }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)

  if (error) return { ok: false as const, status: 503, error: "Subscription service unavailable" }
  if (!data?.length) return { ok: false as const, status: 403, error: "Active subscription required" }

  return { ok: true as const, userId }
}
