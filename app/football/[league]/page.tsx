import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import BrandMark from "@/components/BrandMark"
import { getLeague, LEAGUES } from "@/lib/leagues"

const SITE_URL = "https://quantedgefootball.com"

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-")
}

export function generateStaticParams() {
  return LEAGUES.map((league) => ({ league: slugify(league.name) }))
}

export async function generateMetadata({ params }: { params: Promise<{ league: string }> }): Promise<Metadata> {
  const { league: slug } = await params
  const league = LEAGUES.find((item) => slugify(item.name) === slug)
  if (!league) return {}

  return {
    title: `${league.name} Football Analysis, Fixtures and Ratings`,
    description: `Research ${league.name} fixtures with team form, player ratings, probabilities, projected lineups and match context from Quant Edge.`,
    alternates: { canonical: `${SITE_URL}/football/${slug}` },
    openGraph: {
      title: `${league.name} Football Analysis | Quant Edge`,
      description: `Football fixture research, team form, player ratings and probability context for ${league.name}.`,
      url: `${SITE_URL}/football/${slug}`,
      type: "website",
    },
  }
}

export default async function PublicLeaguePage({ params }: { params: Promise<{ league: string }> }) {
  const { league: slug } = await params
  const league = LEAGUES.find((item) => slugify(item.name) === slug)
  if (!league || !getLeague(league.id)) notFound()

  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-4 text-sm"><Link className="text-slate-300 hover:text-white" href="/about">About</Link><Link className="rounded-full border border-cyan-200/30 px-4 py-2 text-cyan-100 hover:bg-cyan-300/10" href="/sign-up">Free preview</Link></div>
        </nav>

        <header className="mt-16 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-300">{league.country} football research</p>
          <h1 className="mt-4 text-5xl font-bold leading-[0.98] sm:text-7xl">{league.name} analysis</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">Follow {league.name} fixtures with clearer context: recent team form, player ratings, projected lineups, model probabilities, odds comparison, and match history in one research workspace.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link className="rounded-full bg-lime-300 px-5 py-3 font-semibold text-slate-950 hover:bg-lime-200" href="/sign-up">Explore 2 free matches</Link><Link className="rounded-full border border-cyan-200/30 px-5 py-3 text-cyan-100 hover:bg-cyan-300/10" href="/pricing">View Pro</Link></div>
        </header>

        <section className="mt-16 grid gap-5 md:grid-cols-3">
          <article className="qe-panel rounded-2xl border p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Fixtures</p><h2 className="mt-3 text-xl font-bold">See what is next</h2><p className="mt-3 text-sm leading-6 text-slate-400">Browse upcoming fixtures and recent results, then open a match brief for the evidence behind the model view.</p></article>
          <article className="qe-panel rounded-2xl border p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Teams</p><h2 className="mt-3 text-xl font-bold">Compare current form</h2><p className="mt-3 text-sm leading-6 text-slate-400">Inspect wins, draws, goals, clean sheets, player availability, and recent performance before kickoff.</p></article>
          <article className="qe-panel rounded-2xl border p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Players</p><h2 className="mt-3 text-xl font-bold">Go beyond goals</h2><p className="mt-3 text-sm leading-6 text-slate-400">Ratings consider recent match performances, minutes, role-specific actions, and the context of important goals.</p></article>
        </section>

        <section className="mt-16 border-t border-slate-800 pt-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">How to use Quant Edge</p><h2 className="mt-3 text-3xl font-bold">Football analysis, not betting tips</h2><p className="mt-4 max-w-3xl leading-7 text-slate-400">Quant Edge presents data and model estimates to help supporters, fantasy players, analysts, and responsible decision-makers investigate a fixture. Probabilities are estimates, not guarantees, and missing information is shown rather than invented.</p></section>

        <section className="mt-12 border-t border-slate-800 py-8"><h2 className="text-xl font-bold">Explore other competitions</h2><div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">{LEAGUES.filter((item) => item.id !== league.id).map((item) => <Link className="text-sm text-cyan-300 hover:text-cyan-100" href={`/football/${slugify(item.name)}`} key={item.id}>{item.name}</Link>)}</div></section>
      </div>
    </main>
  )
}
