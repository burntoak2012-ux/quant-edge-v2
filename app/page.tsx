import Link from "next/link"
import { LanguageSelector } from "@/components/LanguageProvider"
import BrandMark from "@/components/BrandMark"

export default function Home() {
  return (
    <main className="qe-grid min-h-screen px-6 py-8 text-white sm:px-10">
      <div className="mx-auto flex min-h-[85vh] max-w-6xl flex-col justify-between">
        <nav className="flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-3"><LanguageSelector /><Link className="rounded-full border border-cyan-200/30 px-4 py-2 text-sm text-slate-200 hover:border-cyan-200 hover:bg-cyan-200/10" href="/sign-in">Sign in</Link></div>
        </nav>

        <section className="max-w-5xl py-16 sm:py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-lime-300">Football intelligence, built for serious fans</p>
          <h1 className="max-w-4xl text-5xl font-bold leading-[0.96] tracking-tight sm:text-7xl">
            Better match context before the whistle.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
            Quant Edge helps you understand the shape of a match in real time: team form, confidence, projected lineups, rating context and the details that matter before kicking off.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="rounded-full bg-lime-300 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-lime-300/10 hover:bg-lime-200" href="/pricing">Start with Pro</Link>
            <Link className="rounded-full border border-lime-300/40 px-5 py-3 text-lime-200 hover:border-lime-300 hover:bg-lime-300/10" href="/sign-up">Explore 2 free matches</Link>
            <Link className="rounded-full border border-cyan-200/30 px-5 py-3 text-slate-200 hover:border-cyan-300 hover:bg-cyan-300/10" href="/sign-up">Create account</Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">Free preview. No payment required.</p>
        </section>

        <section className="grid gap-4 pb-6 md:grid-cols-3">
          {[
            {
              title: "Match signals",
              text: "Read a cleaner probability split, form context, and an analyst-style brief before kickoff.",
            },
            {
              title: "Projected XIs",
              text: "See the likely starting shape, player roles, and lineup impact when team sheets become relevant.",
            },
            {
              title: "Research-first design",
              text: "Built for informed football fans, analysts, and professionals who want more than a score headline.",
            },
          ].map((item) => (
            <div className="qe-panel rounded-2xl border border-slate-800 bg-slate-900/60 p-5" key={item.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 border-t border-slate-800 py-8 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Why people stay</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">A cleaner way to understand football matches.</h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
              <li><span className="font-semibold text-white">No hype:</span> no betting-style spin, just context, ratings and match structure.</li>
              <li><span className="font-semibold text-white">Built for sharp viewing:</span> understand the shape of a game before the first major event.</li>
              <li><span className="font-semibold text-white">More than a score:</span> team data, player context, ratings, and recent form in one place.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Trusted by curious football minds</p>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-3xl font-bold text-white">2 free match cards</p>
                <p className="mt-1 text-sm text-slate-300">Try the product before deciding on Pro.</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-lime-300">£9.99</p>
                <p className="mt-1 text-sm text-slate-300">A simple monthly plan for deeper football research.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center gap-5 text-xs text-slate-500"><Link href="/about">About</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a className="hover:text-slate-300" href="mailto:quantedgefootball@outlook.com">quantedgefootball@outlook.com</a></footer>
      </div>
    </main>
  )
}