import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white sm:px-10">
      <div className="mx-auto flex min-h-[85vh] max-w-6xl flex-col justify-between">
        <nav className="flex items-center justify-between">
          <span className="text-sm font-bold tracking-wide">QUANT EDGE</span>
          <Link className="text-sm text-slate-300 hover:text-white" href="/sign-in">Sign in</Link>
        </nav>
        <section className="max-w-3xl py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Football intelligence for sharper decisions</p>
          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl">See the edge before kickoff.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">Quant Edge combines team form, internal player efficiency ratings, and confirmed lineups into a focused match signal dashboard.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200" href="/pricing">Start with Pro</Link>
            <Link className="rounded-lg border border-slate-700 px-5 py-3 text-slate-200 hover:border-cyan-400" href="/sign-up">Create account</Link>
          </div>
        </section>
        <footer className="flex gap-5 text-xs text-slate-500"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></footer>
      </div>
    </main>
  )
}