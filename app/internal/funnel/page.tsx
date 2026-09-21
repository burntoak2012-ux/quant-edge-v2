import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { hasInternalAccess } from "@/lib/requireInternalAccess"

type EventRow = {
  event_name: string
  user_id: string | null
  created_at: string
}

const FUNNEL_STEPS = [
  { key: "free_preview_view", label: "Free preview viewed" },
  { key: "pricing_view", label: "Pricing page viewed" },
  { key: "checkout_start", label: "Checkout started" },
  { key: "checkout_completed", label: "Checkout completed" },
  { key: "subscription_active", label: "Subscription active" },
  { key: "subscription_canceled", label: "Subscription canceled" },
  { key: "lineup_alert_subscribed", label: "Lineup alert subscribed" },
  { key: "lineup_alert_sent", label: "Lineup alert sent" },
] as const

export default async function InternalFunnelPage() {
  if (!(await hasInternalAccess())) notFound()

  const { data, error } = supabase
    ? await supabase
        .from("analytics_events")
        .select("event_name,user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: null, error: new Error("Analytics is not configured") }

  const rows = (data || []) as EventRow[]
  const counts = FUNNEL_STEPS.map((step) => ({
    ...step,
    total: rows.filter((row) => row.event_name === step.key).length,
    uniqueUsers: new Set(rows.filter((row) => row.event_name === step.key && row.user_id).map((row) => row.user_id)).size,
  }))
  const recent = rows.slice(0, 40)

  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Internal analytics</p>
        <h1 className="mt-2 text-4xl font-bold">Conversion funnel</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Last 500 recorded events. Counts include both signed-in and anonymous visitors where available.</p>

        {error && <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Analytics tracking is not available yet.</div>}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((step) => (
            <div className="qe-panel rounded-2xl border p-5" key={step.key}>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{step.label}</p>
              <p className="mt-3 text-3xl font-bold text-white">{step.total}</p>
              <p className="mt-1 text-xs text-slate-500">{step.uniqueUsers} unique signed-in users</p>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Raw feed</p>
          <h2 className="mt-2 text-2xl font-bold">Recent events</h2>
          <div className="qe-panel mt-5 overflow-hidden rounded-2xl border">
            {recent.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">No events recorded yet.</p>
            ) : recent.map((row, index) => (
              <div className="flex items-center justify-between border-b border-slate-800 p-3 text-sm last:border-b-0" key={`${row.created_at}-${index}`}>
                <span className="font-semibold text-cyan-200">{row.event_name}</span>
                <span className="text-slate-400">{row.user_id || "anonymous"}</span>
                <span className="text-slate-500">{new Date(row.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
