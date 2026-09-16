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

type TeamStats = {
  league?: { season?: number; name?: string }
  form?: string
  fixtures?: { played?: { total?: number }; wins?: { total?: number }; draws?: { total?: number }; loses?: { total?: number } }
  goals?: { for?: { total?: { total?: number } }; against?: { total?: { total?: number } } }
  clean_sheet?: { total?: number }
  cards?: { yellow?: { total?: number }; red?: { total?: number } }
  corners?: { total?: { total?: number } }
}

type TeamStatsResponse = { response?: TeamStats; errors?: Record<string, string> }
type HeadToHeadFixture = { fixture?: { date?: string; status?: { short?: string } }; teams?: { home?: { name?: string }; away?: { name?: string } }; goals?: { home?: number | null; away?: number | null } }
type HeadToHeadResponse = { response?: HeadToHeadFixture[] }

async function fetchTeamStats(teamId: number, leagueId: number, apiKey: string) {
  for (const season of [new Date().getUTCFullYear(), 2024]) {
    const response = await fetch(`${API_URL}/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`, { headers: { "x-apisports-key": apiKey }, next: { revalidate: 21600 } })
    const data = await response.json() as TeamStatsResponse
    if (data.response) return data.response
  }
  return null
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
  const leagueId = Number(league) || 0
  const [homeStats, awayStats, headToHeadResponse] = await Promise.all([
    leagueId ? fetchTeamStats(homeId, leagueId, apiKey) : Promise.resolve(null),
    leagueId ? fetchTeamStats(awayId, leagueId, apiKey) : Promise.resolve(null),
    fetch(`${API_URL}/fixtures/headtohead?h2h=${homeId}-${awayId}`, { headers: { "x-apisports-key": apiKey }, next: { revalidate: 21600 } }).then((result) => result.json() as Promise<HeadToHeadResponse>).catch(() => null),
  ])
  const homeTeamStats = homeStats
  const awayTeamStats = awayStats
  const comparisonRows = [
    ["Form", homeTeamStats?.form?.slice(-5) || "-", awayTeamStats?.form?.slice(-5) || "-"],
    ["Played", homeTeamStats?.fixtures?.played?.total, awayTeamStats?.fixtures?.played?.total],
    ["Wins", homeTeamStats?.fixtures?.wins?.total, awayTeamStats?.fixtures?.wins?.total],
    ["Draws", homeTeamStats?.fixtures?.draws?.total, awayTeamStats?.fixtures?.draws?.total],
    ["Losses", homeTeamStats?.fixtures?.loses?.total, awayTeamStats?.fixtures?.loses?.total],
    ["Goals for", homeTeamStats?.goals?.for?.total?.total, awayTeamStats?.goals?.for?.total?.total],
    ["Goals against", homeTeamStats?.goals?.against?.total?.total, awayTeamStats?.goals?.against?.total?.total],
    ["Clean sheets", homeTeamStats?.clean_sheet?.total, awayTeamStats?.clean_sheet?.total],
    ["Yellow cards", homeTeamStats?.cards?.yellow?.total, awayTeamStats?.cards?.yellow?.total],
    ["Corners", homeTeamStats?.corners?.total?.total, awayTeamStats?.corners?.total?.total],
  ]
  const headToHead = headToHeadResponse?.response?.slice(0, 5) || []
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

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Team comparison</p>
          <h2 className="mt-2 text-2xl font-bold">The numbers behind the fixture</h2>
          <div className="qe-panel mt-5 overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-4 py-3">Metric</th><th className="px-4 py-3 text-cyan-200">{homeName}</th><th className="px-4 py-3 text-lime-200">{awayName}</th></tr></thead>
              <tbody>{comparisonRows.map(([label, homeValue, awayValue]) => <tr className="border-t border-slate-800" key={label}><td className="px-4 py-3 text-slate-400">{label}</td><td className="px-4 py-3 font-semibold">{homeValue ?? "-"}</td><td className="px-4 py-3 font-semibold">{awayValue ?? "-"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Head to head</p>
          <h2 className="mt-2 text-2xl font-bold">Recent meetings</h2>
          <div className="qe-panel mt-5 rounded-2xl border">
            {headToHead.length > 0 ? headToHead.map((meeting, index) => <div className="flex items-center justify-between border-b border-slate-800 p-4 text-sm last:border-b-0" key={`${meeting.fixture?.date}-${index}`}><span className="text-slate-400">{meeting.fixture?.date ? new Date(meeting.fixture.date).toLocaleDateString() : "-"}</span><span>{meeting.teams?.home?.name || "Home"} <span className="mx-2 text-slate-600">vs</span> {meeting.teams?.away?.name || "Away"}</span><span className="font-semibold text-cyan-200">{meeting.goals?.home ?? "-"} - {meeting.goals?.away ?? "-"}</span></div>) : <p className="p-5 text-sm text-slate-400">Head-to-head history is unavailable for this fixture.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
