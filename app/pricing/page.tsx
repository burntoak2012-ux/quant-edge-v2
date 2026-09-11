"use client"
import { useState } from "react"
import { SignInButton } from "@clerk/nextjs"

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  async function subscribe() {
    setLoading(true)

    try {
      const res = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const responseText = await res.text()
      let json: { url?: string; error?: string } = {}

      try {
        json = JSON.parse(responseText)
      } catch {
        json.error = responseText || `Server returned HTTP ${res.status}`
      }

      if (json.url) {
        window.location.href = json.url
      } else {
        alert(json.error || `Failed to create checkout session (HTTP ${res.status})`)
      }
    } catch (e) {
      console.error(e)
      alert("Checkout failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white sm:p-10">
      <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Quant Edge</p>
      <h1 className="mt-3 text-4xl font-bold">Simple access to the edge</h1>
      <p className="mt-3 max-w-xl text-slate-400">One plan for serious match analysis, with lineup-aware ratings when confirmed team sheets arrive.</p>
      <div className="mt-10 max-w-md rounded-2xl border border-cyan-400/40 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Pro</h2>
        <p className="mt-2 text-sm text-slate-400">Live signals and lineup totals, billed monthly.</p>
        <div className="mt-4">
          <button
            className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
            onClick={subscribe}
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Subscribe"}
          </button>
          <div className="mt-4 text-sm text-slate-400">Already have an account? <SignInButton mode="modal"><button className="text-cyan-300 underline">Sign in</button></SignInButton></div>
        </div>
      </div>
      </div>
    </main>
  )
}
