"use client"
import { useEffect, useState } from "react"
import { SignInButton } from "@clerk/nextjs"
import { LanguageSelector, useLanguage } from "@/components/LanguageProvider"
import BrandMark from "@/components/BrandMark"
import { trackEvent } from "@/lib/analyticsClient"

export default function PricingPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    trackEvent("pricing_view")
  }, [])

  async function subscribe() {
    setLoading(true)
    trackEvent("checkout_start")

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
    <main className="qe-grid min-h-screen p-6 text-white sm:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex justify-end"><LanguageSelector /></div>
        <BrandMark />
        <h1 className="mt-3 text-4xl font-bold">{t.todayEdge}</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Football research for people who want a better read on the match before kickoff.</p>

        <div className="mt-8 max-w-xl border border-cyan-100/10 bg-slate-900/40 p-5">
          <h2 className="font-semibold text-cyan-100">Free preview</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Try two daily fixtures with the core probability split, team context, and match overview. No card required.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="qe-panel rounded-3xl border border-cyan-400/40 p-6">
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="mt-3 text-4xl font-bold text-lime-300">£9.99<span className="text-base font-medium text-slate-400"> / month</span></p>
            <p className="mt-2 text-sm text-slate-400">A clean, simple monthly plan for deeper football research.</p>

            <div className="mt-5 border-y border-cyan-100/10 py-4 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-cyan-100">Football research, not betting tips.</p>
              <p className="mt-1">Quant Edge gives you data, probabilities, ratings, projected lineups and context to support your own decisions. It does not provide betting advice, guarantee outcomes, or promise profits.</p>
              <p className="mt-3 text-lime-200">14-day refund policy. Cancel anytime.</p>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <p>• Match signals and probability context</p>
              <p>• Team and player research tools</p>
              <p>• Projected XIs and lineup-aware match insight</p>
              <p>• Daily fixture coverage across key leagues</p>
            </div>

            <div className="mt-6">
              <button
                className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
                onClick={subscribe}
                disabled={loading}
              >
                {loading ? "Redirecting..." : "Subscribe"}
              </button>
              <div className="mt-4 text-sm text-slate-400">Already have an account? <SignInButton mode="modal"><button className="text-cyan-300 underline">Sign in</button></SignInButton></div>
              <p className="mt-4 text-xs leading-5 text-slate-500">By subscribing, you confirm that you are responsible for your own decisions and comply with the laws and platform rules that apply to you.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Built for</p>
            <h2 className="mt-3 text-2xl font-bold">Serious football followers</h2>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <li>Analysts who want deeper match context.</li>
              <li>Fans who prefer informed reading over headline bias.</li>
              <li>People who want to understand the likely shape of a game.</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-lime-400/20 bg-lime-400/5 p-4 text-sm text-lime-100">
              <p className="font-semibold">Why it works:</p>
              <p className="mt-2">The product stays information-rich and premium without pretending to be a guaranteed result machine.</p>
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs text-slate-500">Customer service: <a className="text-cyan-300 hover:underline" href="mailto:quantedgefootball@outlook.com">quantedgefootball@outlook.com</a></p>
      </div>
    </main>
  )
}
