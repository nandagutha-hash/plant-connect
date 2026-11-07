CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'distributor', 'admin');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  total_eco_credits INTEGER NOT NULL DEFAULT 0 CHECK (total_eco_credits >= 0),
  level TEXT NOT NULL DEFAULT 'Seedling Explorer' CHECK (
    level IN ('Seedling Explorer', 'Green Guardian', 'Tree Protector', 'Eco Champion', 'Forest Hero')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  phone TEXT NOT NULL,
  email TEXT,
  hours TEXT NOT NULL DEFAULT 'Mon-Fri, 9:00 AM-5:00 PM',
  description TEXT NOT NULL DEFAULT 'Government nursery distributor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, address)
);

CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  common_name TEXT NOT NULL,
  botanical_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (distributor_id, common_name, botanical_name)
);

CREATE INDEX IF NOT EXISTS distributors_location_idx ON distributors (latitude, longitude);
CREATE INDEX IF NOT EXISTS plants_distributor_id_idx ON plants (distributor_id);
CREATE INDEX IF NOT EXISTS plants_quantity_idx ON plants (quantity);

CREATE TABLE IF NOT EXISTS dfo_offices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  office_name TEXT NOT NULL,
  district TEXT NOT NULL,
  division TEXT NOT NULL,
  mandal TEXT NOT NULL DEFAULT '',
  village TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  phone TEXT NOT NULL,
  email TEXT,
  office_type TEXT NOT NULL CHECK (
    office_type IN ('DFO Office', 'Forest Division Office', 'Nursery', 'Sapling Distribution Center')
  ),
  verified BOOLEAN NOT NULL DEFAULT false,
  sapling_distribution_available BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  available_saplings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  operating_hours TEXT NOT NULL DEFAULT 'Mon-Sat, 10:00 AM-5:00 PM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (office_name, district, address)
);

CREATE INDEX IF NOT EXISTS dfo_offices_location_idx ON dfo_offices (latitude, longitude);
CREATE INDEX IF NOT EXISTS dfo_offices_district_idx ON dfo_offices (district);
CREATE INDEX IF NOT EXISTS dfo_offices_search_idx ON dfo_offices (district, mandal, village);
CREATE INDEX IF NOT EXISTS dfo_offices_verified_search_idx ON dfo_offices (verified, status, district, village);
CREATE INDEX IF NOT EXISTS dfo_offices_distribution_idx ON dfo_offices (sapling_distribution_available, status);

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
    milestone IN (
      '15-Day Growth Update',
      '30-Day Growth Update',
      '60-Day Growth Update',
      '90-Day Growth Update',
      'Mature Plant Verification',
      '30 Day Progress',
      '90 Day Growth',
      '180 Day Survival',
      '365 Day Healthy Growth'
    )
  ),
  UNIQUE (plantation_id, milestone)
);

CREATE TABLE IF NOT EXISTS eco_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plantation_id UUID REFERENCES plantations(id) ON DELETE CASCADE,
  progress_update_id UUID REFERENCES progress_updates(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL CHECK (
    milestone IN (
      'Initial Plantation',
      '15-Day Growth Update',
      '30-Day Growth Update',
      '60-Day Growth Update',
      '90-Day Growth Update',
      'Mature Plant Verification',
      'Plant Registered',
      '30 Day Progress',
      '90 Day Growth',
      '180 Day Survival',
      '365 Day Healthy Growth'
    )
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
