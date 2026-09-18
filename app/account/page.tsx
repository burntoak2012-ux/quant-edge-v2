import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import BrandMark from "@/components/BrandMark"

export default function AccountPage() {
  return (
    <main className="qe-grid min-h-screen p-6 text-white sm:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <BrandMark compact />
            <h1 className="mt-3 text-3xl font-bold">Your account</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border border-cyan-400/50 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10" href="/pricing">
              Plans
            </Link>
            <UserButton />
          </div>
        </div>
        <section className="qe-panel mt-10 rounded-3xl border p-6">
          <p className="text-sm text-slate-400">Subscription</p>
          <h2 className="mt-2 text-xl font-semibold">Pro access enabled</h2>
          <p className="mt-2 text-sm text-slate-400">Your account is ready to use the live match intelligence dashboard.</p>
          <Link className="mt-6 inline-block rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" href="/app">Open dashboard</Link>
        </section>
      </div>
    </main>
  )
}
