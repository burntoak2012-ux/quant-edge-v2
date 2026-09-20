# Quant Edge Marketing Plan

## Launch position

**Quant Edge is football research and decision support, not a tipping service.**

Suggested one-line description:

> Compare team form, player ratings, projected lineups, probabilities, odds, and match context before making your own decision.

Founding beta price: **£9.99/month** with a clear 14-day refund policy, subject to the final published terms.

## Launch gates for tomorrow

Before broad promotion, verify:

- Vercel production deployment is Ready.
- Live Stripe checkout shows £9.99/month.
- Live Stripe webhook returns HTTP 200.
- Supabase creates and reads the active subscription.
- A paid account can access `/app`.
- An inactive account is blocked from paid match data.
- The dashboard fixture feed works for a selected date.
- Prediction rows appear in `prediction_snapshots`.
- `/performance` loads without errors.
- Support contact, refund policy, terms, privacy, and responsible-gambling wording are visible.

If one of these fails, keep the launch as a private beta until it is repaired.

## Audience

Start with people who already follow football closely:

- fans of the Premier League and major European leagues
- fantasy football players
- football analysts and data-minded supporters
- responsible recreational bettors who want more context
- people who enjoy comparing teams and players before matches

Avoid targeting people with promises of easy money or guaranteed winners.

## First-week plan

### Day 1: Founding beta

- Invite 5–10 trusted users individually.
- Offer £9.99/month and the 14-day refund policy.
- Ask them to use the dashboard before a real fixture.
- Record where they hesitate or misunderstand the product.

### Day 2–3: Observe behaviour

Track:

- landing page to signup conversion
- signup to checkout conversion
- checkout completion
- dashboard return visits
- league and match brief usage
- language selector usage
- cancellations and refund requests

Do not change model weights based on one match or one person's reaction.

### Day 4–7: Improve clarity

Prioritize changes that help users answer:

- What is the model saying?
- What evidence supports it?
- What is uncertain or missing?
- How does the market compare?
- What should I investigate next?

## WhatsApp message

> I’ve launched the Quant Edge founding beta: a football research tool for comparing team form, player ratings, projected lineups, probabilities, bookmaker context, league tables, and fixture history.
>
> It is not a tipping service and does not guarantee results. The goal is to help you make better-informed decisions with more context.
>
> Founding beta access is £9.99/month, with a 14-day refund policy. Try it here:
>
> https://quant-edge-v2.vercel.app
>
> I’d value honest feedback on the match analysis, probability split, odds context, projected XI ratings, and whether you would keep using it.

## Content themes

Publish short, useful posts rather than sales claims:

- “What changed in this fixture’s probability split?”
- “How confirmed lineups changed the team comparison”
- “Why bookmaker odds and model probability can disagree”
- “How we score a player from 60–99”
- “What our model got wrong this week”
- “How to read a football probability without treating it as certainty”

Every post should show context and limitations. Never use guaranteed-win language.

## Metrics to review weekly

### Business

- active subscribers
- new paid users
- conversion rate
- churn
- refunds
- average revenue per user

### Product

- returning users before kickoff
- most-viewed leagues
- most-viewed match briefs
- team/player profile visits
- calendar usage
- language usage

### Model

- settled prediction count
- accuracy
- Brier score when available
- calibration by probability band
- performance by league
- potential-value accuracy
- actual ROI only after a documented staking method exists

## Messaging guardrails

Use:

- research
- context
- model estimate
- market comparison
- potential value
- uncertainty
- responsible decision

Avoid:

- guaranteed winner
- banker
- sure bet
- free money
- fixed profit
- bet this now
- never loses

## Two-week decision point

After at least two weeks of settled predictions and real user behaviour:

- keep £9.99 if conversion and retention are healthy;
- improve onboarding if people sign up but do not return;
- improve calibration if confidence does not match outcomes;
- add data caching before increasing audience size;
- publish an honest model-performance summary.

The goal of the first launch is not maximum reach. It is to prove that people return because Quant Edge helps them understand fixtures better.
