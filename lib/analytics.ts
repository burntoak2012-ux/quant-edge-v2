import { supabase } from "./supabaseClient"

export type FunnelEvent =
  | "free_preview_view"
  | "pricing_view"
  | "checkout_start"
  | "checkout_completed"
  | "subscription_active"
  | "subscription_canceled"

export async function logEvent(eventName: FunnelEvent, userId?: string | null, metadata: Record<string, unknown> = {}) {
  if (!supabase) return

  try {
    const { error } = await supabase.from("analytics_events").insert({
      event_name: eventName,
      user_id: userId || null,
      metadata,
    })
    if (error) console.warn("Analytics event insert failed", { eventName, error: error.message })
  } catch (error) {
    console.warn("Analytics event insert failed", { eventName, error })
  }
}
