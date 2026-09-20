import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import BrandMark from "@/components/BrandMark"

const BILLING_ERROR_MESSAGES: Record<string, string> = {
  unavailable: "Billing is not configured yet. Contact support and we'll help directly.",
  lookup: "We couldn't check your subscription right now. Please try again in a moment.",
  no_customer: "We couldn't find an active Stripe subscription on this account. Contact support if you believe this is a mistake.",
  portal: "We couldn't open the billing portal. Please try again, or contact support.",
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ billing_error?: string }>
}) {
  const { billing_error: billingError } = await searchParams
  const billingErrorMessage = billingError ? BILLING_ERROR_MESSAGES[billingError] : null

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
        {billingErrorMessage && (
          <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
            {billingErrorMessage}
          </div>
        )}
        <section className="qe-panel mt-10 rounded-3xl border p-6">
          <p className="text-sm text-slate-400">Subscription</p>
          <h2 className="mt-2 text-xl font-semibold">Pro access enabled</h2>
          <p className="mt-2 text-sm text-slate-400">Your account is ready to use the live match intelligence dashboard.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="inline-block rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" href="/app">Open dashboard</Link>
            <form action="/api/stripe/portal" method="post">
              <button className="rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/10" type="submit">
                Manage or cancel subscription
              </button>
            </form>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Billing changes are securely managed by Stripe. Your available cancellation options are shown in the billing portal.</p>
        </section>
        <p className="mt-6 text-xs text-slate-500">Customer service: <a className="text-cyan-300 hover:underline" href="mailto:quantedgefootball@outlook.com">quantedgefootball@outlook.com</a></p>
      </div>
    </main>
  )
}
