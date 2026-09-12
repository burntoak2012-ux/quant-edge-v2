import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabase } from "@/lib/supabaseClient"

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
  : null

function toIsoTimestamp(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")
  const body = await req.text()

  try {
    if (!stripe || !supabase || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Stripe or Supabase is not configured" },
        { status: 503 }
      )
    }

    const event = stripe.webhooks.constructEvent(
      body,
      sig || "",
      process.env.STRIPE_WEBHOOK_SECRET
    )

    // Handle relevant events: checkout.session.completed, customer.subscription.updated, invoice.payment_succeeded
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id || session.client_reference_id
        if (!userId || !session.customer) {
          throw new Error("Checkout session is missing user identity")
        }

        const customerResult = await supabase.from("customers").upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer,
            checkout_session_id: session.id,
            metadata: session.metadata || {},
          },
          { onConflict: "stripe_customer_id" }
        )
        if (customerResult.error) throw customerResult.error

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const result = await supabase.from("subscriptions").upsert({
            id: subscription.id,
            user_id: userId,
            customer: String(subscription.customer),
            status: subscription.status,
            price: subscription.items.data[0]?.price.id || null,
            current_period_start: toIsoTimestamp(subscription.items.data[0]?.current_period_start),
            current_period_end: toIsoTimestamp(subscription.items.data[0]?.current_period_end),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          if (result.error) throw result.error
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.user_id
        if (!userId) {
          console.warn("Ignoring subscription event without user metadata", event.id)
          break
        }
        const result = await supabase.from("subscriptions").upsert({
          id: sub.id,
          user_id: userId,
          customer: String(sub.customer),
          status: sub.status === "canceled" ? "canceled" : sub.status,
          price: sub.items?.data?.[0]?.price?.id || null,
          current_period_start: sub.items?.data?.[0]?.current_period_start
            ? new Date(sub.items.data[0].current_period_start * 1000).toISOString()
            : null,
          current_period_end: sub.items?.data?.[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        })
        if (result.error) throw result.error
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("Stripe webhook error:", err)
    const message = err instanceof Error ? err.message : "Unknown webhook error"
    return NextResponse.json({ error: `Webhook processing failed: ${message}` }, { status: 500 })
  }
}
