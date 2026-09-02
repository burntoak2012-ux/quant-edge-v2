import { UserButton } from "@clerk/nextjs"
import Link from "next/link"

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white sm:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Quant Edge</p>
            <h1 className="mt-3 text-3xl font-bold">Your account</h1>
          </div>
          <UserButton />
        </div>
        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Subscription</p>
          <h2 className="mt-2 text-xl font-semibold">Pro access enabled</h2>
          <p className="mt-2 text-sm text-slate-400">Your account is ready to use the live match intelligence dashboard.</p>
          <Link className="mt-6 inline-block rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" href="/app">Open dashboard</Link>
        </section>
      </div>
    </main>
  )
}
