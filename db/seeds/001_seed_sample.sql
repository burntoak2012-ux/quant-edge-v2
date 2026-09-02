-- Seed: sample customer and subscription rows for local testing

INSERT INTO customers (user_id, stripe_customer_id, checkout_session_id, metadata)
VALUES
  ('user_123', 'cus_test_123', 'cs_test_123', '{"plan":"pro"}');

INSERT INTO subscriptions (id, user_id, customer, status, price, current_period_start, current_period_end)
VALUES
  ('sub_test_123', 'user_123', 'cus_test_123', 'active', 'price_test_123', now(), now() + INTERVAL '30 days');

-- Note: These sample IDs are placeholders. Replace with real Stripe IDs when testing end-to-end.
