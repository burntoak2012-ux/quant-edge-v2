import { NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@clerk/nextjs/server"

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
  : null

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const priceId = process.env.STRIPE_PRICE_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin

    if (!userId) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    if (!stripe || !priceId) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      client_reference_id: userId,
      metadata: { user_id: userId },
      subscription_data: {
        metadata: { user_id: userId },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Create session error:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
