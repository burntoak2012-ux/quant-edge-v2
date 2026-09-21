CREATE TABLE IF NOT EXISTS lineup_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  fixture_id BIGINT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE (user_id, fixture_id)
);

CREATE INDEX IF NOT EXISTS idx_lineup_alerts_pending_kickoff
  ON lineup_alerts (status, kickoff);