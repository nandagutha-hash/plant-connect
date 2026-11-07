CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
