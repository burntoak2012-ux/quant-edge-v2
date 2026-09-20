"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const STORAGE_EVENT_NAME = "qe-saved-briefs-changed"

type SavedBrief = {
  id: string
  fixtureId: number
  homeTeam: string
  awayTeam: string
  savedAt: string
}

const STORAGE_KEY = "qe-saved-briefs-v1"

function readSavedBriefs(): SavedBrief[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedBrief[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSavedBriefs(items: SavedBrief[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function SaveBriefButton({
  fixtureId,
  homeTeam,
  awayTeam,
}: {
  fixtureId: number
  homeTeam: string
  awayTeam: string
}) {
  const [isSaved, setIsSaved] = useState(() => readSavedBriefs().some((brief) => brief.fixtureId === fixtureId))

  function toggleSavedBrief() {
    const current = readSavedBriefs()
    const alreadySaved = current.some((brief) => brief.fixtureId === fixtureId)
    const next = alreadySaved
      ? current.filter((brief) => brief.fixtureId !== fixtureId)
      : [{
          id: `fixture-${fixtureId}`,
          fixtureId,
          homeTeam,
          awayTeam,
          savedAt: new Date().toISOString(),
        }, ...current].slice(0, 12)

    writeSavedBriefs(next)
    setIsSaved(!alreadySaved)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(STORAGE_EVENT_NAME))
    }
  }

  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-semibold ${isSaved ? "border border-lime-300/40 bg-lime-300 text-slate-950" : "border border-cyan-200/30 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"}`}
      onClick={(event) => {
        event.stopPropagation()
        toggleSavedBrief()
      }}
      type="button"
    >
      {isSaved ? "Saved brief" : "Save brief"}
    </button>
  )
}

export function SavedBriefsPanel() {
  const [briefs, setBriefs] = useState<SavedBrief[]>(() => readSavedBriefs())

  useEffect(() => {
    const handleChange = () => setBriefs(readSavedBriefs())

    if (typeof window !== "undefined") {
      window.addEventListener(STORAGE_EVENT_NAME, handleChange)
      window.addEventListener("storage", handleChange)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(STORAGE_EVENT_NAME, handleChange)
        window.removeEventListener("storage", handleChange)
      }
    }
  }, [])

  const visibleBriefs = briefs.slice(0, 4)

  return (
    <section className="mb-8 rounded-3xl border border-lime-300/20 bg-slate-950/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-300">Saved briefs</p>
          <h2 className="mt-2 text-2xl font-bold">Match notes</h2>
        </div>
        <span className="rounded-full border border-lime-300/40 bg-lime-300/10 px-2.5 py-1 text-xs font-semibold text-lime-200">
          {briefs.length} saved
        </span>
      </div>

      {visibleBriefs.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Save a fixture brief to keep key match notes ready for your next review.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleBriefs.map((brief) => (
            <Link
              className="block rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-sm text-slate-200 hover:border-cyan-300"
              href={`/fixtures/${brief.fixtureId}`}
              key={brief.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{brief.homeTeam} vs {brief.awayTeam}</p>
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{new Date(brief.savedAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
              </div>
              <p className="mt-1 text-xs text-cyan-100">Open match brief</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
