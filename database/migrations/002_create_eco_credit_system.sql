ALTER TABLE users
  ADD COLUMN IF NOT EXISTS total_eco_credits INTEGER NOT NULL DEFAULT 0 CHECK (total_eco_credits >= 0);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'Seedling Explorer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_level_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_level_check
      CHECK (level IN ('Seedling Explorer', 'Green Guardian', 'Tree Protector', 'Eco Champion', 'Forest Hero'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS plantations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  plantation_date DATE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'tracking', 'verified', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id UUID NOT NULL REFERENCES plantations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  milestone TEXT NOT NULL CHECK (
    milestone IN ('30 Day Progress', '90 Day Growth', '180 Day Survival', '365 Day Healthy Growth')
  ),
  UNIQUE (plantation_id, milestone)
);

CREATE TABLE IF NOT EXISTS eco_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plantation_id UUID REFERENCES plantations(id) ON DELETE CASCADE,
  progress_update_id UUID REFERENCES progress_updates(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL CHECK (
    milestone IN ('Plant Registered', '30 Day Progress', '90 Day Growth', '180 Day Survival', '365 Day Healthy Growth')
  ),
  credits INTEGER NOT NULL CHECK (credits > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plantation_id, milestone),
  UNIQUE (progress_update_id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  reward_name TEXT NOT NULL UNIQUE,
  credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_id)
);

CREATE INDEX IF NOT EXISTS plantations_user_idx ON plantations (user_id);
CREATE INDEX IF NOT EXISTS plantations_location_idx ON plantations (latitude, longitude);
CREATE INDEX IF NOT EXISTS progress_updates_plantation_idx ON progress_updates (plantation_id);
CREATE INDEX IF NOT EXISTS progress_updates_uploaded_idx ON progress_updates (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS eco_credits_user_idx ON eco_credits (user_id);
CREATE INDEX IF NOT EXISTS eco_credits_plantation_idx ON eco_credits (plantation_id);
CREATE INDEX IF NOT EXISTS rewards_credit_cost_idx ON rewards (credit_cost);
CREATE INDEX IF NOT EXISTS redemptions_user_idx ON redemptions (user_id);
