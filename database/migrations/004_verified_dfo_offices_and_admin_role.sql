DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'admin'
      AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END
$$;

ALTER TABLE dfo_offices
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE dfo_offices
  ALTER COLUMN email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS dfo_offices_verified_search_idx
  ON dfo_offices (verified, status, district, village);
