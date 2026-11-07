ALTER TABLE plantations
  ADD COLUMN IF NOT EXISTS image_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM plantations WHERE image_url IS NULL) THEN
    ALTER TABLE plantations
      ALTER COLUMN image_url SET NOT NULL;
  ELSE
    RAISE NOTICE 'plantations.image_url contains legacy rows without uploaded photos; NOT NULL was not applied.';
  END IF;
END
$$;

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

DO $$
BEGIN
  IF to_regclass('public.progress_uploads') IS NOT NULL THEN
    INSERT INTO progress_updates (id, plantation_id, image_url, uploaded_at, milestone)
    SELECT id, plantation_id, image_url, uploaded_at, milestone
    FROM progress_uploads
    ON CONFLICT (plantation_id, milestone) DO NOTHING;
  END IF;
END
$$;

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

CREATE INDEX IF NOT EXISTS progress_updates_plantation_idx ON progress_updates (plantation_id);
CREATE INDEX IF NOT EXISTS progress_updates_uploaded_idx ON progress_updates (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS eco_credits_user_idx ON eco_credits (user_id);
CREATE INDEX IF NOT EXISTS eco_credits_plantation_idx ON eco_credits (plantation_id);
