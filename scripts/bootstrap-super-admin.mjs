import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const required = {
  DATABASE_URL: process.env.DATABASE_URL,
  PLANTCONNECT_SUPER_ADMIN_EMAIL: process.env.PLANTCONNECT_SUPER_ADMIN_EMAIL,
  PLANTCONNECT_SUPER_ADMIN_NAME: process.env.PLANTCONNECT_SUPER_ADMIN_NAME,
  PLANTCONNECT_SUPER_ADMIN_PASSWORD: process.env.PLANTCONNECT_SUPER_ADMIN_PASSWORD
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const [key, value] of Object.entries(required)) {
  if (!value) {
    fail(`${key} is required`);
  }
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(required.PLANTCONNECT_SUPER_ADMIN_EMAIL)) {
  fail("PLANTCONNECT_SUPER_ADMIN_EMAIL must be a valid email address");
}

if (
  required.PLANTCONNECT_SUPER_ADMIN_PASSWORD.length < 12 ||
  !/[a-z]/.test(required.PLANTCONNECT_SUPER_ADMIN_PASSWORD) ||
  !/[A-Z]/.test(required.PLANTCONNECT_SUPER_ADMIN_PASSWORD) ||
  !/[0-9]/.test(required.PLANTCONNECT_SUPER_ADMIN_PASSWORD) ||
  !/[^A-Za-z0-9]/.test(required.PLANTCONNECT_SUPER_ADMIN_PASSWORD)
) {
  fail("PLANTCONNECT_SUPER_ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol");
}

const pool = new Pool({
  connectionString: required.DATABASE_URL,
  ssl: required.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined
});

const client = await pool.connect();

try {
  const email = required.PLANTCONNECT_SUPER_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(required.PLANTCONNECT_SUPER_ADMIN_PASSWORD, 12);

  await client.query("BEGIN");
  const result = await client.query(
    `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        account_status,
        must_change_password,
        session_version
      )
      VALUES ($1, $2, $3, 'super_admin', 'active', true, 1)
      ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = 'super_admin',
          account_status = 'active',
          must_change_password = true,
          session_version = COALESCE(users.session_version, 0) + 1,
          updated_at = now()
      RETURNING id, email, role
    `,
    [required.PLANTCONNECT_SUPER_ADMIN_NAME, email, passwordHash]
  );
  const user = result.rows[0];

  await client.query(
    `
      INSERT INTO audit_logs (
        actor_id,
        actor_email,
        actor_role,
        target_user_id,
        target_type,
        target_id,
        action_type,
        reason,
        metadata
      )
      VALUES ($1, $2, 'super_admin', $1, 'admin', $3, 'bootstrap.super_admin', 'Initial super admin bootstrap', $4)
    `,
    [
      user.id,
      user.email,
      user.id,
      {
        role: user.role,
        mustChangePassword: true
      }
    ]
  );

  await client.query("COMMIT");
  console.log(`Super admin account is ready for ${user.email}. Password rotation is required on first login.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : "Bootstrap failed");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
