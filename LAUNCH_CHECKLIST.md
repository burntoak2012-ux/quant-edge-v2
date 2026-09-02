# Quant Edge Launch Checklist

## Production setup

### 1) Clerk
- Create a production Clerk app.
- Add http://localhost:3000 and your Vercel domain as allowed origins.
- Set:
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  - CLERK_SECRET_KEY
- Verify /sign-in and /sign-up work in production mode.

### 2) Stripe
- Create a Stripe Product and recurring Price.
- Copy the Price ID into STRIPE_PRICE_ID.
- Set:
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
- Configure the webhook endpoint to: https://<your-domain>/api/stripe/webhook
- Test checkout and ensure webhook events create/update subscription entries.

### 3) Supabase
- Create a Supabase production project.
- Run the billing migration SQL.
- Confirm the subscriptions table has a user_id and status field.
- Verify the app can read active subscription state.

### 4) Vercel
- Push the repo to GitHub.
- Import the project into Vercel.
- Add all env vars from .env.example.
- Set NEXT_PUBLIC_APP_URL to the production URL.
- Deploy and verify the app loads without auth errors.

### 5) Monetization validation
- Sign up via Clerk.
- Open /pricing.
- Complete a Stripe checkout flow.
- Confirm the user lands on /account.
- Confirm the API routes accept the signed-in user once the subscription is active.
- Confirm a cancelled or inactive subscription blocks access.

### 6) Final launch prep
- Review legal pages.
- Add payment support contact info.
- Set up basic analytics.
- Run a smoke test on the full flow from sign-up to paid access.
- Launch to a small beta group before broader marketing.

## Start here

1. Create production Clerk app.
2. Create Stripe product + price.
3. Create Supabase project.
4. Deploy to Vercel.
5. Test billing flow end-to-end.

## Suggested first pricing tier

- Pro: $19/month or $29/month
- One clear feature set
- Simple upgrade flow
- No extra complexity until conversion and retention are proven.
