"use client"

import { useEffect, useState } from "react"
import { FiBell, FiBellOff } from "react-icons/fi"

type Props = {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  kickoff: string
  lineupsConfirmed: boolean
}

export function LineupAlertButton({ fixtureId, homeTeam, awayTeam, kickoff, lineupsConfirmed }: Props) {
  const [subscribed, setSubscribed] = useState(false)
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    fetch(`/api/alerts/subscriptions?fixtureId=${fixtureId}`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!active) return
        if (!response.ok) throw new Error(data.error || "Alert status unavailable")
        setSubscribed(Boolean(data.subscribed))
        setStatus("idle")
      })
      .catch((error) => {
        if (!active) return
        setMessage(error instanceof Error ? error.message : "Alert status unavailable")
        setStatus("error")
      })
    return () => { active = false }
  }, [fixtureId])

  async function toggleAlert() {
    setStatus("saving")
    setMessage("")
    const response = await fetch(`/api/alerts/subscriptions${subscribed ? `?fixtureId=${fixtureId}` : ""}`, {
      method: subscribed ? "DELETE" : "POST",
      headers: subscribed ? undefined : { "Content-Type": "application/json" },
      body: subscribed ? undefined : JSON.stringify({ fixtureId, homeTeam, awayTeam, kickoff }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error || "Unable to update alert")
      setStatus("error")
      return
    }
    setSubscribed(Boolean(data.subscribed))
    setStatus("idle")
  }

  if (lineupsConfirmed) {
    return <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 px-4 py-2 text-sm text-lime-200"><FiBell /> Lineups confirmed</span>
  }

  return (
    <div>
      <button
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${subscribed ? "border-lime-300/40 bg-lime-300 text-slate-950" : "border-cyan-200/30 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"}`}
        disabled={status === "loading" || status === "saving"}
        onClick={toggleAlert}
        title={subscribed ? "Turn off confirmed-lineup email" : "Email me when both lineups are confirmed"}
        type="button"
      >
        {subscribed ? <FiBellOff /> : <FiBell />}
        {status === "saving" ? "Saving..." : subscribed ? "Alert enabled" : "Lineup alert"}
      </button>
      {message && <p className="mt-2 max-w-64 text-xs text-amber-300">{message}</p>}
    </div>
  )
}