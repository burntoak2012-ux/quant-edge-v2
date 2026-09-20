import { NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabaseClient"

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
  : null

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url), { status: 303 })
  }

  if (!stripe || !supabase) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 })
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Stripe portal customer lookup failed:", error)
    return NextResponse.json({ error: "Subscription service unavailable" }, { status: 503 })
  }

  if (!customer?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/pricing", req.url), { status: 303 })
  }

  try {
    const origin = new URL(req.url).origin
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${origin}/account`,
    })

    return NextResponse.redirect(session.url, { status: 303 })
  } catch (error) {
    console.error("Stripe portal session creation failed:", error)
    return NextResponse.json({ error: "Unable to open billing portal" }, { status: 500 })
  }
}