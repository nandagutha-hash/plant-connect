CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status TEXT,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE users SET account_status = 'active' WHERE account_status IS NULL;

ALTER TABLE users
  ALTER COLUMN account_status SET DEFAULT 'active',
  ALTER COLUMN account_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_account_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('active', 'suspended', 'banned', 'deleted'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_moderated_by_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_moderated_by_fkey
      FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE distributors
  ADD COLUMN IF NOT EXISTS approval_status TEXT,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE distributors SET approval_status = 'approved' WHERE approval_status IS NULL;

ALTER TABLE distributors
  ALTER COLUMN approval_status SET DEFAULT 'pending',
  ALTER COLUMN approval_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distributors_approval_status_check') THEN
    ALTER TABLE distributors ADD CONSTRAINT distributors_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distributors_reviewed_by_fkey') THEN
    ALTER TABLE distributors ADD CONSTRAINT distributors_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE dfo_offices
  ADD COLUMN IF NOT EXISTS full_address TEXT,
  ADD COLUMN IF NOT EXISTS working_hours TEXT,
  ADD COLUMN IF NOT EXISTS office_status TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE dfo_offices
SET full_address = COALESCE(full_address, address),
    working_hours = COALESCE(working_hours, operating_hours),
    office_status = COALESCE(
      office_status,
      CASE
        WHEN status = 'inactive' THEN 'inactive'
        WHEN verified = true THEN 'verified'
        ELSE 'pending'
      END
    );

ALTER TABLE dfo_offices
  ALTER COLUMN full_address SET NOT NULL,
  ALTER COLUMN working_hours SET DEFAULT 'Mon-Sat, 10:00 AM-5:00 PM',
  ALTER COLUMN working_hours SET NOT NULL,
  ALTER COLUMN office_status SET DEFAULT 'pending',
  ALTER COLUMN office_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dfo_offices_office_status_check') THEN
    ALTER TABLE dfo_offices ADD CONSTRAINT dfo_offices_office_status_check
      CHECK (office_status IN ('verified', 'pending', 'inactive', 'closed'));
  END IF;
END
$$;

ALTER TABLE plantations
  ADD COLUMN IF NOT EXISTS plantation_status TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS image_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS fraud_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fraud_signals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS owner_email_snapshot TEXT;

UPDATE plantations p
SET plantation_status = COALESCE(p.plantation_status, 'approved'),
    owner_name_snapshot = COALESCE(p.owner_name_snapshot, u.name),
    owner_email_snapshot = COALESCE(p.owner_email_snapshot, u.email)
FROM users u
WHERE p.user_id = u.id;

UPDATE plantations SET plantation_status = 'approved' WHERE plantation_status IS NULL;

ALTER TABLE plantations
  ALTER COLUMN plantation_status SET DEFAULT 'pending',
  ALTER COLUMN plantation_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plantations_moderation_status_check') THEN
    ALTER TABLE plantations ADD CONSTRAINT plantations_moderation_status_check
      CHECK (plantation_status IN ('pending', 'approved', 'rejected', 'flagged', 'under_review'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plantations_fraud_score_check') THEN
    ALTER TABLE plantations ADD CONSTRAINT plantations_fraud_score_check
      CHECK (fraud_score BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plantations_reviewed_by_fkey') THEN
    ALTER TABLE plantations ADD CONSTRAINT plantations_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE progress_updates
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS image_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS progress_status TEXT,
  ADD COLUMN IF NOT EXISTS fraud_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fraud_signals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE progress_updates pu
SET user_id = COALESCE(pu.user_id, p.user_id),
    latitude = COALESCE(pu.latitude, p.latitude),
    longitude = COALESCE(pu.longitude, p.longitude),
    progress_status = COALESCE(pu.progress_status, 'approved')
FROM plantations p
WHERE pu.plantation_id = p.id;

UPDATE progress_updates SET progress_status = 'approved' WHERE progress_status IS NULL;

ALTER TABLE progress_updates
  ALTER COLUMN progress_status SET DEFAULT 'pending',
  ALTER COLUMN progress_status SET NOT NULL;

ALTER TABLE progress_updates DROP CONSTRAINT IF EXISTS progress_updates_milestone_check;
ALTER TABLE progress_updates ADD CONSTRAINT progress_updates_milestone_check
  CHECK (
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
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_updates_status_check') THEN
    ALTER TABLE progress_updates ADD CONSTRAINT progress_updates_status_check
      CHECK (progress_status IN ('pending', 'approved', 'rejected', 'flagged', 'under_review'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_updates_fraud_score_check') THEN
    ALTER TABLE progress_updates ADD CONSTRAINT progress_updates_fraud_score_check
      CHECK (fraud_score BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_updates_user_id_fkey') THEN
    ALTER TABLE progress_updates ADD CONSTRAINT progress_updates_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_updates_reviewed_by_fkey') THEN
    ALTER TABLE progress_updates ADD CONSTRAINT progress_updates_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE eco_credits
  ADD COLUMN IF NOT EXISTS credit_status TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT;

UPDATE eco_credits SET credit_status = 'approved' WHERE credit_status IS NULL;

ALTER TABLE eco_credits
  ALTER COLUMN credit_status SET DEFAULT 'pending',
  ALTER COLUMN credit_status SET NOT NULL;

ALTER TABLE eco_credits DROP CONSTRAINT IF EXISTS eco_credits_milestone_check;
ALTER TABLE eco_credits ADD CONSTRAINT eco_credits_milestone_check
  CHECK (
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
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eco_credits_status_check') THEN
    ALTER TABLE eco_credits ADD CONSTRAINT eco_credits_status_check
      CHECK (credit_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eco_credits_reviewed_by_fkey') THEN
    ALTER TABLE eco_credits ADD CONSTRAINT eco_credits_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS reward_status TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE rewards SET reward_status = 'active' WHERE reward_status IS NULL;

ALTER TABLE rewards
  ALTER COLUMN reward_status SET DEFAULT 'active',
  ALTER COLUMN reward_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rewards_status_check') THEN
    ALTER TABLE rewards ADD CONSTRAINT rewards_status_check
      CHECK (reward_status IN ('active', 'inactive', 'deleted'));
  END IF;
END
$$;

ALTER TABLE redemptions
  ADD COLUMN IF NOT EXISTS redemption_status TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS credit_cost_snapshot INTEGER;

UPDATE redemptions r
SET redemption_status = COALESCE(r.redemption_status, 'approved'),
    credit_cost_snapshot = COALESCE(r.credit_cost_snapshot, rw.credit_cost)
FROM rewards rw
WHERE r.reward_id = rw.id;

UPDATE redemptions SET redemption_status = 'approved' WHERE redemption_status IS NULL;

ALTER TABLE redemptions
  ALTER COLUMN redemption_status SET DEFAULT 'pending',
  ALTER COLUMN redemption_status SET NOT NULL,
  ALTER COLUMN credit_cost_snapshot SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_status_check') THEN
    ALTER TABLE redemptions ADD CONSTRAINT redemptions_status_check
      CHECK (redemption_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_reviewed_by_fkey') THEN
    ALTER TABLE redemptions ADD CONSTRAINT redemptions_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE plantations DROP CONSTRAINT IF EXISTS plantations_user_id_fkey;
ALTER TABLE plantations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE plantations ADD CONSTRAINT plantations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE eco_credits DROP CONSTRAINT IF EXISTS eco_credits_user_id_fkey;
ALTER TABLE eco_credits ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE eco_credits ADD CONSTRAINT eco_credits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE redemptions DROP CONSTRAINT IF EXISTS redemptions_user_id_fkey;
ALTER TABLE redemptions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE redemptions ADD CONSTRAINT redemptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (setting_key, setting_value)
VALUES
  ('fraud_duplicate_gps_radius_meters', '10'::jsonb),
  ('fraud_gps_lookback_hours', '24'::jsonb),
  ('fraud_rapid_window_minutes', '10'::jsonb),
  ('fraud_suspicious_threshold', '31'::jsonb),
  ('fraud_highly_suspicious_threshold', '61'::jsonb),
  ('daily_credit_limit', '500'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_id TEXT,
  target_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE INDEX IF NOT EXISTS users_role_status_idx ON users (role, account_status);
CREATE INDEX IF NOT EXISTS users_email_search_idx ON users (lower(email));
CREATE INDEX IF NOT EXISTS distributors_approval_idx ON distributors (approval_status);
CREATE INDEX IF NOT EXISTS dfo_offices_public_status_idx ON dfo_offices (office_status, district);
CREATE INDEX IF NOT EXISTS plantations_review_queue_idx ON plantations (plantation_status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS plantations_fingerprint_idx ON plantations (image_fingerprint) WHERE image_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS plantations_user_time_idx ON plantations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS progress_review_queue_idx ON progress_updates (progress_status, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS progress_fingerprint_idx ON progress_updates (image_fingerprint) WHERE image_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS progress_user_time_idx ON progress_updates (user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS eco_credits_status_user_idx ON eco_credits (user_id, credit_status, created_at DESC);
CREATE INDEX IF NOT EXISTS rewards_status_idx ON rewards (reward_status, credit_cost);
CREATE INDEX IF NOT EXISTS redemptions_status_idx ON redemptions (redemption_status, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_time_idx ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_target_time_idx ON audit_logs (target_type, target_id, created_at DESC);
