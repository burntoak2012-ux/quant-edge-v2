-- Store model predictions so Quant Edge can measure calibration and real performance.
CREATE TABLE IF NOT EXISTS prediction_snapshots (
  fixture_id BIGINT PRIMARY KEY,
  fixture_date TIMESTAMPTZ,
  league_id INTEGER NOT NULL,
  home_team_id INTEGER NOT NULL,
  home_team TEXT NOT NULL,
  away_team_id INTEGER NOT NULL,
  away_team TEXT NOT NULL,
  home_rating NUMERIC NOT NULL,
  away_rating NUMERIC NOT NULL,
  home_projected_rating NUMERIC,
  away_projected_rating NUMERIC,
  home_probability NUMERIC NOT NULL,
  draw_probability NUMERIC NOT NULL,
  away_probability NUMERIC NOT NULL,
  predicted_outcome TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  bookmaker_odds NUMERIC,
  value_percent NUMERIC,
  actual_home_goals INTEGER,
  actual_away_goals INTEGER,
  outcome_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prediction_snapshots_fixture_date
  ON prediction_snapshots(fixture_date);
CREATE INDEX IF NOT EXISTS idx_prediction_snapshots_outcome_status
  ON prediction_snapshots(outcome_status);
