"use client"
import { useState } from "react"
import { SignInButton } from "@clerk/nextjs"
import { LanguageSelector, useLanguage } from "@/components/LanguageProvider"
import BrandMark from "@/components/BrandMark"

export default function PricingPage() {
  const { t } = useLanguage()
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
    <main className="qe-grid min-h-screen p-6 text-white sm:p-10">
      <div className="mx-auto max-w-3xl">
      <div className="flex justify-end"><LanguageSelector /></div>
      <BrandMark />
      <h1 className="mt-3 text-4xl font-bold">{t.todayEdge}</h1>
      <p className="mt-3 max-w-xl text-slate-400">One plan for serious match analysis, with lineup-aware ratings when confirmed team sheets arrive.</p>
      <div className="mt-8 max-w-md border border-cyan-100/10 bg-slate-900/40 p-5"><h2 className="font-semibold text-cyan-100">Free preview</h2><p className="mt-2 text-sm leading-6 text-slate-400">Explore two daily fixtures with the core probability split and team context. No card required.</p></div>
      <div className="qe-panel mt-10 max-w-md rounded-3xl border border-cyan-400/40 p-6">
        <h2 className="text-xl font-semibold">Pro</h2>
        <p className="mt-3 text-4xl font-bold text-lime-300">£9.99<span className="text-base font-medium text-slate-400"> / month</span></p>
        <p className="mt-2 text-sm text-slate-400">Live signals and lineup totals, billed monthly.</p>
        <div className="mt-5 border-y border-cyan-100/10 py-4 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-cyan-100">Football research, not betting tips.</p>
          <p className="mt-1">Quant Edge provides data, probabilities, ratings, and match context to support your own decisions. It does not provide betting advice, guarantee outcomes, or promise profits.</p>
          <p className="mt-3 text-lime-200">14-day refund policy. Cancel anytime.</p>
        </div>
        <div className="mt-4">
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
      </div>
    </main>
  )
}
