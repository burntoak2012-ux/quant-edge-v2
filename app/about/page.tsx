import Link from "next/link"

const principles = [
  ["Evidence before excitement", "Ratings, probabilities, odds, team data, lineups, and performance records should be visible and open to question."],
  ["Probability is not a promise", "A model estimate is not a guaranteed result. It is one input to compare with context, the market, and your own judgement."],
  ["Make uncertainty visible", "Missing lineups, unavailable odds, baseline data, and limited samples are shown rather than replaced with invented precision."],
  ["Measure ourselves", "Predictions are stored and settled against results so accuracy and calibration can be evaluated over time."],
  ["Keep the user in control", "Quant Edge supports research. It does not replace personal judgement, financial planning, or responsible gambling choices."],
]

export default function AboutPage() {
  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between"><Link className="text-sm font-bold tracking-[0.18em] text-cyan-200" href="/">QUANT EDGE</Link><Link className="rounded-full border border-cyan-200/30 px-4 py-2 text-sm text-slate-200 hover:border-cyan-200 hover:bg-cyan-200/10" href="/pricing">View Pro</Link></nav>
        <header className="mt-16 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-300">Our manifesto</p>
          <h1 className="mt-4 text-5xl font-bold leading-[0.98] sm:text-7xl">Football is context, not certainty.</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">Quant Edge is an informational football research service. We help users compare team performance, player data, projected lineups, probabilities, bookmaker context, and match history before making their own decisions.</p>
        </header>

        <section className="qe-panel mt-12 rounded-3xl border border-lime-300/30 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-lime-200">We are not a betting tips provider.</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-200">Quant Edge does not tell users what to bet, provide financial or betting advice, guarantee match results, or promise profits. The platform presents data and model estimates for information and research only. Every user remains responsible for their own decisions and for gambling responsibly.</p>
        </section>

        <section className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">How we work</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {principles.map(([title, copy]) => <article className="qe-panel rounded-2xl border p-5" key={title}><h2 className="text-xl font-bold">{title}</h2><p className="mt-3 leading-7 text-slate-400">{copy}</p></article>)}
          </div>
        </section>

        <section className="mt-12 border-t border-cyan-100/10 py-8 text-sm leading-7 text-slate-400">
          <p><strong className="text-slate-200">Our promise:</strong> make evidence easier to inspect, assumptions easier to question, and uncertainty harder to ignore.</p>
          <p className="mt-3">Use Quant Edge responsibly. Never stake more than you can afford to lose.</p>
          <div className="mt-5 flex gap-5 text-cyan-300"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div>
        </section>
      </div>
    </main>
  )
}