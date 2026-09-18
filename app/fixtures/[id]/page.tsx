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
type MatchStatistic = { type?: string; value?: string | number | null }
type LiveStatisticResponse = { response?: Array<{ team?: { name?: string }; statistics?: MatchStatistic[] }> }
type LineupPlayer = { player?: { name?: string; pos?: string; grid?: string }; position?: string }
type LineupResponse = { response?: Array<{ team?: { name?: string }; formation?: string; startXI?: LineupPlayer[] }> }
type MatchEvent = { time?: { elapsed?: number | null; extra?: number | null }; team?: { name?: string }; player?: { name?: string }; assist?: { name?: string | null }; type?: string; detail?: string; comments?: string | null }
type EventsResponse = { response?: MatchEvent[] }

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

function formatEuropeanDate(value?: string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value))
}

function eventSymbol(event: MatchEvent) {
  if (event.type === "Goal") return "GOAL"
  if (event.type === "Card") return event.detail?.includes("Red") ? "RED" : "YELLOW"
  if (event.type === "subst") return "SUB"
  if (event.type === "VAR") return "VAR"
  return event.type || "EVENT"
}

function formPoints(form?: string) {
  return (form || "").toUpperCase().split("").filter((result) => "WDL".includes(result)).slice(-5).reduce((total, result) => total + (result === "W" ? 3 : result === "D" ? 1 : 0), 0)
}

function pitchPosition(grid?: string) {
  const [row, column] = grid?.split(":").map(Number) || []
  if (!row || !column) return null
  return { top: `${((row - 1) / 10) * 88 + 6}%`, left: `${((column - 1) / 6) * 82 + 9}%` }
}

function compileResearchBrief({
  homeName,
  awayName,
  homeForm,
  awayForm,
  lineupsPublished,
  liveStatisticsPublished,
  probabilities,
  status,
}: {
  homeName: string
  awayName: string
  homeForm?: string
  awayForm?: string
  lineupsPublished: boolean
  liveStatisticsPublished: boolean
  probabilities: ReturnType<typeof calculateMatchProbabilities>
  status?: string
}) {
  const notes = []
  const probabilityGap = Math.abs(probabilities.home - probabilities.away)

  if (lineupsPublished) notes.push("Confirmed team sheets are available. Review the starting XIs and formations before relying on pre-match ratings.")
  else notes.push("Confirmed team sheets are not published yet. Lineup changes can materially alter the match context.")
  if (homeForm && awayForm) notes.push(`${homeName} recent form: ${homeForm.slice(-5)}. ${awayName} recent form: ${awayForm.slice(-5)}.`)
  if (probabilityGap <= 8) notes.push("The model sees a balanced matchup. The draw probability and late team news deserve extra attention.")
  else if (probabilities.home > probabilities.away) notes.push(`${homeName} holds the stronger current model position, but the probability split remains an estimate rather than an instruction.`)
  else notes.push(`${awayName} holds the stronger current model position, but the probability split remains an estimate rather than an instruction.`)
  if (liveStatisticsPublished) notes.push(`Live provider statistics are available while the match status is ${status || "updating"}. Compare possession, shots, cards, and corners in context.`)
  else notes.push("No live provider statistics are published yet. Check the match brief again as kickoff approaches or the match begins.")

  return notes
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
    next: { revalidate: 60 },
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
  const [homeStats, awayStats, headToHeadResponse, liveStatsResponse, lineupsResponse, eventsResponse] = await Promise.all([
    leagueId ? fetchTeamStats(homeId, leagueId, apiKey) : Promise.resolve(null),
    leagueId ? fetchTeamStats(awayId, leagueId, apiKey) : Promise.resolve(null),
    fetch(`${API_URL}/fixtures/headtohead?h2h=${homeId}-${awayId}`, { headers: { "x-apisports-key": apiKey }, next: { revalidate: 21600 } }).then((result) => result.json() as Promise<HeadToHeadResponse>).catch(() => null),
    fetch(`${API_URL}/fixtures/statistics?fixture=${fixtureId}`, { headers: { "x-apisports-key": apiKey }, next: { revalidate: 60 } }).then((result) => result.json() as Promise<LiveStatisticResponse>).catch(() => null),
    fetch(`${API_URL}/fixtures/lineups?fixture=${fixtureId}`, { headers: { "x-apisports-key": apiKey }, next: { revalidate: 60 } }).then((result) => result.json() as Promise<LineupResponse>).catch(() => null),
    fetch(`${API_URL}/fixtures/events?fixture=${fixtureId}`, { headers: { "x-apisports-key": apiKey }, next: { revalidate: 60 } }).then((result) => result.json() as Promise<EventsResponse>).catch(() => null),
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
  const liveStats = liveStatsResponse?.response || []
  const homeLiveStats = liveStats.find((entry) => entry.team?.name === homeName)?.statistics || []
  const awayLiveStats = liveStats.find((entry) => entry.team?.name === awayName)?.statistics || []
  const liveStatTypes = Array.from(new Set([...homeLiveStats, ...awayLiveStats].map((stat) => stat.type).filter(Boolean)))
  const lineups = lineupsResponse?.response || []
  const events = eventsResponse?.response || []
  const researchNotes = compileResearchBrief({
    homeName,
    awayName,
    homeForm: homeTeamStats?.form,
    awayForm: awayTeamStats?.form,
    lineupsPublished: lineups.length > 0,
    liveStatisticsPublished: liveStatTypes.length > 0,
    probabilities,
    status: fixture.fixture?.status?.long,
  })
  const homeFormPoints = formPoints(homeTeamStats?.form)
  const awayFormPoints = formPoints(awayTeamStats?.form)
  const homeGoalsPerGame = homeTeamStats?.fixtures?.played?.total && typeof homeTeamStats.goals?.for?.total?.total === "number"
    ? (homeTeamStats.goals.for.total.total / homeTeamStats.fixtures.played.total).toFixed(2)
    : "-"
  const awayGoalsPerGame = awayTeamStats?.fixtures?.played?.total && typeof awayTeamStats.goals?.for?.total?.total === "number"
    ? (awayTeamStats.goals.for.total.total / awayTeamStats.fixtures.played.total).toFixed(2)
    : "-"
  const homeConcededPerGame = homeTeamStats?.fixtures?.played?.total && typeof homeTeamStats.goals?.against?.total?.total === "number"
    ? (homeTeamStats.goals.against.total.total / homeTeamStats.fixtures.played.total).toFixed(2)
    : "-"
  const awayConcededPerGame = awayTeamStats?.fixtures?.played?.total && typeof awayTeamStats.goals?.against?.total?.total === "number"
    ? (awayTeamStats.goals.against.total.total / awayTeamStats.fixtures.played.total).toFixed(2)
    : "-"
  const formLeader = homeFormPoints === awayFormPoints ? "Neither side" : homeFormPoints > awayFormPoints ? homeName : awayName
  const modelLeader = probabilities.home === probabilities.away ? "Balanced" : probabilities.home > probabilities.away ? homeName : awayName
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Live research brief</p>
            <h2 className="mt-2 text-2xl font-bold">What changed for this fixture</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-300">
              {researchNotes.map((note, index) => <li className={`border-l-2 pl-3 ${index % 2 ? "border-cyan-300" : "border-lime-300"}`} key={note}>{note}</li>)}
            </ul>
            <p className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500">This brief updates from match, lineup, form, and live-statistics data. External news and injury reports require a verified news provider before they can be included.</p>
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

        <section className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Match lens</p>
          <h2 className="mt-2 text-2xl font-bold">Where the matchup may be decided</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Recent form edge</p><p className="mt-2 truncate text-lg font-semibold text-white">{formLeader}</p><p className="mt-2 text-xs text-slate-400">{homeName} {homeFormPoints}/15 · {awayName} {awayFormPoints}/15</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Model edge</p><p className="mt-2 truncate text-lg font-semibold text-cyan-200">{modelLeader}</p><p className="mt-2 text-xs text-slate-400">{probabilities.home}% home · {probabilities.draw}% draw · {probabilities.away}% away</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Attack rate</p><p className="mt-2 text-lg font-semibold text-white">{homeGoalsPerGame} <span className="text-slate-500">vs</span> {awayGoalsPerGame}</p><p className="mt-2 text-xs text-slate-400">goals per game</p></div>
            <div className="qe-panel rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Defensive rate</p><p className="mt-2 text-lg font-semibold text-lime-200">{homeConcededPerGame} <span className="text-slate-500">vs</span> {awayConcededPerGame}</p><p className="mt-2 text-xs text-slate-400">conceded per game</p></div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="qe-panel rounded-2xl border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Live match data</p>
            <h2 className="mt-2 text-2xl font-bold">Match statistics</h2>
            {liveStatTypes.length > 0 ? <div className="mt-5 space-y-3">{liveStatTypes.map((type) => {
              const homeValue = homeLiveStats.find((stat) => stat.type === type)?.value ?? "-"
              const awayValue = awayLiveStats.find((stat) => stat.type === type)?.value ?? "-"
              return <div className="grid grid-cols-[70px_1fr_70px] items-center gap-3 text-sm" key={type}><span className="text-right font-semibold text-cyan-200">{homeValue}</span><span className="text-center text-xs text-slate-400">{type}</span><span className="font-semibold text-lime-200">{awayValue}</span></div>
            })}</div> : <p className="mt-5 text-sm text-slate-400">Live statistics will appear here after the provider publishes them.</p>}
          </div>

          <div className="qe-panel rounded-2xl border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Team sheets</p>
            <h2 className="mt-2 text-2xl font-bold">Confirmed lineups</h2>
            {lineups.length > 0 ? <div className="mt-5 space-y-5">{lineups.map((lineup) => <div key={lineup.team?.name}><p className="font-semibold text-white">{lineup.team?.name || "Team"} <span className="ml-2 text-xs font-normal text-slate-500">{lineup.formation || "Formation unavailable"}</span></p><p className="mt-2 text-sm leading-7 text-slate-300">{lineup.startXI?.map((player) => player.player?.name).filter(Boolean).join(" · ") || "Starting XI unavailable"}</p></div>)}</div> : <p className="mt-5 text-sm text-slate-400">Confirmed lineups will appear here when published.</p>}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="qe-panel rounded-2xl border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Lineup board</p>
            <h2 className="mt-2 text-2xl font-bold">Formation pitch</h2>
            {lineups.length > 0 ? <div className="mt-5 grid gap-5 lg:grid-cols-2">{lineups.map((lineup) => <div key={lineup.team?.name}><p className="mb-2 text-sm font-semibold">{lineup.team?.name} <span className="text-xs font-normal text-slate-500">{lineup.formation}</span></p><div className="relative aspect-[3/5] overflow-hidden rounded-xl border border-lime-300/30 bg-emerald-900/70" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "100% 20%, 25% 100%" }}>{lineup.startXI?.map((player, index) => { const position = pitchPosition(player.player?.grid); return position ? <span className="absolute -translate-x-1/2 -translate-y-1/2 text-center" key={`${player.player?.name}-${index}`} style={position}><span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-cyan-300 text-[10px] font-bold text-slate-950">{player.player?.pos || "?"}</span><span className="mt-1 block max-w-16 truncate text-[9px] font-semibold text-white">{player.player?.name}</span></span> : null })}</div></div>)}</div> : <p className="mt-5 text-sm text-slate-400">Formation pitch will appear when confirmed XI coordinates are published.</p>}
          </div>

          <div className="qe-panel rounded-2xl border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Live timeline</p>
            <h2 className="mt-2 text-2xl font-bold">Match events</h2>
            {events.length > 0 ? <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">{events.map((event, index) => <div className="border-l-2 border-cyan-300 pl-3 text-sm" key={`${event.time?.elapsed}-${event.type}-${index}`}><div className="flex justify-between gap-3"><span className="font-semibold text-cyan-100">{event.time?.elapsed ?? "-"}&apos;</span><span className="text-xs text-lime-200">{eventSymbol(event)}</span></div><p className="mt-1 font-medium">{event.player?.name || event.team?.name || "Match event"}</p><p className="mt-1 text-xs text-slate-400">{event.team?.name}{event.assist?.name ? ` · Assist: ${event.assist.name}` : ""}{event.comments ? ` · ${event.comments}` : ""}</p></div>)}</div> : <p className="mt-5 text-sm text-slate-400">Goals, cards, substitutions, and other live events will appear here when published.</p>}
          </div>
        </section>

        <section className="mt-8 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Head to head</p>
          <h2 className="mt-2 text-2xl font-bold">Recent meetings</h2>
          <div className="qe-panel mt-5 rounded-2xl border">
            {headToHead.length > 0 ? headToHead.map((meeting, index) => <div className="flex items-center justify-between border-b border-slate-800 p-4 text-sm last:border-b-0" key={`${meeting.fixture?.date}-${index}`}><span className="text-slate-400">{formatEuropeanDate(meeting.fixture?.date)}</span><span>{meeting.teams?.home?.name || "Home"} <span className="mx-2 text-slate-600">vs</span> {meeting.teams?.away?.name || "Away"}</span><span className="font-semibold text-cyan-200">{meeting.goals?.home ?? "-"} - {meeting.goals?.away ?? "-"}</span></div>) : <p className="p-5 text-sm text-slate-400">Head-to-head history is unavailable for this fixture.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
