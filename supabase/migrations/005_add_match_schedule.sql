-- Add start_time trigger for individual match scheduling
ALTER TABLE matches ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT NULL;

-- Add round_dates to tournaments for per-round date handling (League format)
-- Stored as JSONB: { "1": "2024-01-01", "2": "2024-01-08" }
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS round_dates JSONB DEFAULT '{}'::jsonb;
