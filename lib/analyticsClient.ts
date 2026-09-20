export function trackEvent(event: "free_preview_view" | "pricing_view" | "checkout_start", metadata?: Record<string, unknown>) {
  if (typeof window === "undefined") return

  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, metadata }),
    keepalive: true,
  }).catch(() => {
    // Best-effort only; tracking failures should never affect the user experience.
  })
}
