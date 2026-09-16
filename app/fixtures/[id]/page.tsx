import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireActiveSubscription } from "@/lib/requireSubscription"
import { calculateMatchProbabilities } from "@/lib/matchProbability"

const API_URL = "https://v3.football.api-sports.io"

type FixtureResponse = {
  response?: Array<{
    fixture?: { id?: number; date?: string; status?: { long?: string; short?: string }; venue?: { name?: string; city?: string } }
    league?: { name?: string; country?: string; round?: string }
    teams?: { home?: { id?: number; name?: string }; away?: { id?: number; name?: string } }
  }>
}

function probabilityBar(label: string, value: number) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold text-cyan-200">{value}%</span></div>
      <div className="mt-2 h-2 bg-slate-800"><div className="h-full bg-cyan-300" style={{ width: `${value}%` }} /></div>
    </div>
  )
}

export default async function FixturePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ home?: string; away?: string; league?: string; homeRating?: string; awayRating?: string }>
}) {
  const access = await requireActiveSubscription()
  if (!access.ok) redirect(access.status === 401 ? "/sign-in" : "/pricing")

  const { id } = await params
  const { home, away, league, homeRating, awayRating } = await searchParams
  const fixtureId = Number(id)
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!Number.isInteger(fixtureId) || !apiKey) notFound()

  const response = await fetch(`${API_URL}/fixtures?id=${fixtureId}`, {
    headers: { "x-apisports-key": apiKey },
    next: { revalidate: 900 },
  })
  const data = await response.json() as FixtureResponse
  const fixture = data.response?.[0]
  const homeName = fixture?.teams?.home?.name || "Home team"
  const awayName = fixture?.teams?.away?.name || "Away team"
  const homeId = fixture?.teams?.home?.id || Number(home)
  const awayId = fixture?.teams?.away?.id || Number(away)
  if (!fixture || !homeId || !awayId) notFound()

  const probabilities = calculateMatchProbabilities(Number(homeRating) || 70, Number(awayRating) || 70)
  const kickoff = fixture.fixture?.date
    ? new Date(fixture.fixture.date).toLocaleString([], { dateStyle: "full", timeStyle: "short" })
    : "Kickoff unavailable"

  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/app">Back to dashboard</Link>
        <header className="qe-panel mt-6 rounded-3xl border p-6 shadow-xl shadow-black/20 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">{fixture.league?.name || "Competition"}</p>
          <h1 className="mt-3 text-4xl font-bold">{homeName} <span className="text-slate-500">vs</span> {awayName}</h1>
          <p className="mt-3 text-sm text-slate-400">{kickoff} <span className="mx-2 text-slate-600">•</span> {fixture.fixture?.status?.long || "Scheduled"}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-full border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10" href={`/teams/${homeId}?league=${league || ""}`}>View {homeName}</Link>
            <Link className="rounded-full border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10" href={`/teams/${awayId}?league=${league || ""}`}>View {awayName}</Link>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="qe-panel rounded-2xl border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Decision context</p>
            <h2 className="mt-2 text-2xl font-bold">Model probability split</h2>
            <div className="mt-6 space-y-5">
              {probabilityBar(homeName, probabilities.home)}
              {probabilityBar("Draw", probabilities.draw)}
              {probabilityBar(awayName, probabilities.away)}
            </div>
            <p className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500">These are analytical estimates, not betting instructions or guarantees. Ratings and lineup context may update before kickoff.</p>
          </div>

          <div className="qe-panel rounded-2xl border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Research checklist</p>
            <h2 className="mt-2 text-2xl font-bold">What to inspect</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-300">
              <li className="border-l-2 border-lime-300 pl-3">Compare both team profiles and their competition baseline.</li>
              <li className="border-l-2 border-cyan-300 pl-3">Check projected XI ratings once lineups are available.</li>
              <li className="border-l-2 border-cyan-300 pl-3">Compare the probability split with the bookmaker market.</li>
              <li className="border-l-2 border-lime-300 pl-3">Review injuries, motivation, schedule, and uncertainty before deciding anything.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
