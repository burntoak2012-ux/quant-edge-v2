Getting this SaaS live — quick deploy checklist

1) Required environment variables

- `NEXT_PUBLIC_APP_URL` — e.g. https://yourdomain.com
- `API_FOOTBALL_KEY` — required for live match data
- `SOCCERWIKI_API_URL` — optional proxy for Soccerwiki ratings
- Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only; never use the anon key for billing writes)
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Stripe price: `STRIPE_PRICE_ID`
- Lineup alerts: `RESEND_API_KEY`, `LINEUP_ALERT_FROM` (a verified sender such as `Quant Edge <alerts@yourdomain.com>`), `CRON_SECRET`

2) Database (Supabase)

- Apply migration file:
  ```
  psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:<DB_PORT>/<DB_NAME>" -f db/migrations/001_create_billing_tables.sql
  psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:<DB_PORT>/<DB_NAME>" -f db/seeds/001_seed_sample.sql
  psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:<DB_PORT>/<DB_NAME>" -f db/migrations/003_create_lineup_alerts.sql
  ```
- Or use Supabase UI: SQL Editor → run migration and seed SQL.
- Run `db/migrations/002_create_prediction_snapshots.sql` as well. This stores model probabilities and later actual results so calibration and ROI can be measured.

3) Stripe

- Create a Product and Price (recurring). Copy the `priceId` into the server-only `STRIPE_PRICE_ID` variable (for local dev also set in `.env.local`).
- Configure a webhook in Stripe dashboard pointing to `https://<YOUR_DOMAIN>/api/stripe/webhook` and copy the Webhook Signing Secret into `STRIPE_WEBHOOK_SECRET`.

4) Clerk

- Create a Clerk app and add the allowed origin(s) including the dev URL (http://localhost:3000) and your production domain.
- Set Clerk env vars in Vercel.

5) Deploy (Vercel recommended)

- Push changes to GitHub, connect repository in Vercel, set the environment variables in the Vercel dashboard, and deploy.

6) Test flow

- Sign up via `/sign-up` (Clerk). Visit `/pricing` → Subscribe → complete checkout. Confirm Stripe webhook writes to Supabase, then open `/app`.

7) Notes & next steps

- For production reliability add caching for Soccerwiki requests, a job/worker for scraping Flashscore if needed, and monitor Stripe webhook retries.
- Add legal pages and billing email templates before public launch.
