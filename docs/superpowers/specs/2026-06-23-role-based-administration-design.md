# PlantConnect Role-Based Administration Design

**Date:** 2026-06-23

## Executive Summary

PlantConnect will extend its existing Next.js, PostgreSQL/Neon, JWT, and bcrypt architecture into a centralized role-based administration system. PostgreSQL remains the source of truth for roles, account status, moderation decisions, eco-credit eligibility, and audit history. JWTs identify sessions, but protected requests revalidate the current database user so role changes, suspensions, bans, password resets, and deletions take effect immediately.

The implementation preserves the existing user, distributor, discovery, plantation, rewards, and DFO-office experiences. It adds a shared admin shell, domain-specific administration APIs, transactional audit logging, pending credit approval, fraud scoring, soft deletion, and super-admin-only privileged operations.

## Roles And Permission Boundaries

### User

Users can register, sign in, discover verified offices, view sapling availability, register plantations, submit milestone progress, earn approved eco credits, redeem rewards, and view their own history.

### Distributor

Approved distributors can manage only their own profile, plant varieties, inventory, stock counts, nursery photos, requests, and plantation statistics. Pending, rejected, or suspended distributors cannot access distributor management APIs. Distributors cannot manage users, rewards, moderation, admin accounts, or platform settings.

### Admin

Admins can:

- View and search users and their plantation/reward activity.
- Suspend, ban, or restore users with a required reason.
- Review plantation and progress submissions.
- Set submissions to `under_review`, `approved`, `rejected`, or `flagged`.
- Create, edit, verify, and soft-delete DFO or nursery offices.
- Approve, reject, suspend, or restore distributor registrations.
- Create, edit, activate, deactivate, or soft-delete rewards.
- Approve or reject reward redemptions.
- View operational analytics and their own audit activity.

Admins cannot create administrators, promote roles, permanently delete users, alter security settings, or read the complete cross-admin audit history.

### Super Admin

Super admins inherit all admin permissions and can additionally:

- Create and remove admins.
- Promote users to admin or super admin.
- Demote admins.
- Permanently delete users and other eligible records after typed confirmation.
- Manage platform and security settings.
- View all immutable audit logs.
- Manage moderation configuration and database-backed fraud thresholds.

## Centralized Authorization

A typed permission map will define capabilities such as `users.read`, `users.moderate`, `users.delete_permanently`, `plantations.review`, `offices.manage`, `rewards.manage`, `admins.manage`, `audit.read_all`, and `settings.manage`.

All protected API routes call a shared `requirePermission(request, permission)` helper. The helper:

1. Verifies the signed JWT issuer, audience, expiry, subject, and session version.
2. Loads the current user by JWT subject from PostgreSQL.
3. Rejects missing, suspended, banned, or soft-deleted users.
4. Rejects users whose JWT session version no longer matches PostgreSQL.
5. Blocks all normal and privileged application actions while `must_change_password = true`, except password change, logout, and session inspection.
6. Checks the current database role against the centralized permission map.
7. Checks distributor approval status for distributor-only capabilities.

The JWT role is useful for navigation but is never the final authorization source. Role, status, and session version changes invalidate existing sessions immediately.

## Session And Password Security

- Sessions remain HS256 JWTs signed with production `JWT_SECRET`.
- Cookies remain `HttpOnly`, `SameSite=Lax`, `Secure` in production, scoped to `/`, with a seven-day maximum lifetime.
- Login and signup continue validating requests with Zod and hashing passwords with bcrypt cost 12.
- Public signup remains limited to `user` and `distributor` roles.
- The initial super admin is created directly in PostgreSQL by a one-time script that accepts credentials through environment variables; the plaintext password is never stored in source control.
- The initial super admin has `must_change_password = true` and is redirected to `/change-password` after login.
- Changing a password clears `must_change_password`, records `password_changed_at`, increments `session_version`, and issues a replacement session.
- State-changing cookie-authenticated API routes enforce a strict same-origin check.

## Account And Distributor Status

### User Account Status

`account_status` supports:

- `active`
- `suspended`
- `banned`
- `deleted`

Suspend, ban, restore, soft delete, and permanent delete operations require a reason. Normal admin deletion sets `account_status = 'deleted'` and `deleted_at`; it never physically removes the user.

Permanent user deletion is available only to super admins. It requires the actor to type the target email exactly and provide a reason. Historical foreign keys use `ON DELETE SET NULL`, and retained records store non-sensitive user snapshots so plantation, credit, redemption, and audit history survives physical deletion.

### Distributor Approval Status

Distributor profiles support:

- `pending`
- `approved`
- `rejected`
- `suspended`

New distributor signups default to `pending`. Approval, rejection, suspension, and restoration store reviewer, review time, and reason. Rejection and suspension require a reason.

## Plantation And Progress Moderation

### Plantation Status

Plantation submissions use `plantation_status`:

- `pending`
- `approved`
- `rejected`
- `flagged`
- `under_review`

New plantation proof defaults to `pending`. Progress submissions use the same moderation state values through `progress_status`.

Each submission stores:

- User ID
- Plantation ID
- Image URL
- SHA-256 image fingerprint
- GPS latitude and longitude
- Submission timestamp
- Optional user notes
- Moderation status
- Fraud score and fraud signals
- Reviewer ID, review time, and review reason

Only admins and super admins can read `fraud_score` or fraud signals. User profile and public APIs omit those fields.

Admins make every final moderation decision. Fraud detection never automatically approves, rejects, flags, or deletes a submission. A reason is mandatory for `rejected` and `flagged` decisions. Every state transition is audited.

## Fraud Score

`fraud_score` is an integer constrained to `0..100`.

- `0..30`: normal
- `31..60`: suspicious
- `61..100`: highly suspicious

The score is calculated when a plantation or progress proof is submitted and can be recalculated by an administrator. The score is capped at 100 and is composed from transparent database-backed signals:

- Exact image fingerprint previously used by the same user: `+35`
- Exact image fingerprint previously used by another user: `+60`
- Another submission by the same user within the configured GPS radius and 24 hours: `+25`
- Three or more submissions by the same user within 10 minutes: `+20`

Fraud signals are stored as machine-readable text values and rendered only in admin moderation views. GPS proximity is a warning because legitimate plantations may share a location.

Default settings are:

- Duplicate GPS radius: 10 metres
- GPS lookback: 24 hours
- Rapid submission window: 10 minutes
- Suspicious threshold: 31
- Highly suspicious threshold: 61
- Daily approved-credit limit: 500 credits per user

Super admins can modify these settings through database-backed platform settings.

## Pending Eco-Credit Workflow

Submitting proof creates an eco-credit ledger row with `credit_status = 'pending'`. Pending credits do not count toward balances, levels, reward affordability, or redemption eligibility.

Approved milestone values are:

- Initial Plantation: 50 credits
- 15-Day Growth Update: 50 credits
- 30-Day Growth Update: 100 credits
- 60-Day Growth Update: 150 credits
- 90-Day Growth Update: 250 credits
- Mature Plant Verification: 400 credits

The complete approved milestone journey totals 1,000 credits. Approved credit issuance is limited to 500 credits per user per UTC day. Approvals that would exceed the daily limit return a conflict and remain pending for later review; no partial credit is issued.

On administrator approval, the matching ledger row changes from `pending` to `approved`, stores reviewer metadata, and becomes part of the user's balance. Rejection changes it to `rejected`; no credits are added. Flagging retains the credit row in `pending` while the submission is investigated. Reversals require an audited administrator action.

Existing approved eco-credit rows are migrated to `approved` to preserve current balances. Existing legacy milestones remain readable in history, while new submissions use the six canonical milestones above.

Approved earned credits determine user level. Redeemable credits are approved earnings minus approved redemptions and pending redemption reservations.

## Rewards And Redemptions

Rewards use `active`, `inactive`, and `deleted` states plus update timestamps. Admins can create, edit, activate, deactivate, or soft-delete rewards. Super admins may permanently delete a reward only when retention-safe foreign keys allow it.

Redemptions use:

- `pending`
- `approved`
- `rejected`

A redemption request reserves its credit cost while pending to prevent overspending. Admin approval finalizes the deduction. Rejection releases the reservation and requires a reason. Every decision is audited.

## Office Management

The existing DFO-office database, Discover UI, and admin tools remain visually intact. Office records use `office_name`, `district`, `mandal`, `full_address`, `latitude`, `longitude`, `phone`, `email`, `working_hours`, `office_status`, `created_at`, and `updated_at`.

`office_status` supports:

- `verified`
- `pending`
- `inactive`
- `closed`

Only `verified` offices appear in public Discover queries. Pending, inactive, and closed offices remain available to authorized administrators but are hidden from public users. Existing verified/active rows migrate to `verified`; unverified active rows migrate to `pending`; inactive rows migrate to `inactive`.

The existing API routes move to centralized permission checks and audited transactional services. Admin deletion changes the office to `closed`. Super-admin permanent deletion requires confirmation and a reason.

## Audit Logs

`audit_logs` is append-only and stores:

- UUID ID
- Actor/admin ID, email snapshot, and role snapshot
- Target user ID when applicable
- Target type and target ID
- Action type
- Required reason or service-generated operational reason
- JSON metadata containing non-secret before/after details
- Creation timestamp

Audit foreign keys use `ON DELETE SET NULL`. Snapshot fields preserve accountability after account deletion. No application API updates or deletes audit records. A PostgreSQL trigger rejects `UPDATE` and `DELETE` against `audit_logs`, preserving logs permanently even for super admins using the application.

All administrative mutations and their audit rows execute in one PostgreSQL transaction. If audit creation fails, the administrative mutation rolls back.

## Administration Routes

The shared admin layout preserves the existing PlantConnect colors, typography, spacing, and responsive behavior.

- `/admin` - overview and database-derived statistics
- `/admin/users` - search, status moderation, activity, and super-admin role management
- `/admin/distributors` - approval and suspension workflow
- `/admin/offices` - existing DFO/nursery management
- `/admin/plantations` - proof and milestone moderation with admin-only fraud warnings
- `/admin/rewards` - reward CRUD and redemption approval
- `/admin/reports` - user, plantation, office, reward, and moderation aggregates
- `/admin/audit-logs` - own logs for admins; all logs for super admins
- `/admin/settings` - super-admin-only platform/security settings

The `/admin` layout performs a server-side access check. Every corresponding `/api/admin/*` route independently enforces its specific permission.

## API Domains

### Authentication

- `POST /api/auth/change-password`
- Existing login, logout, signup, and current-session routes remain.

### Users And Roles

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/users/:id/role` (super admin)
- `DELETE /api/admin/users/:id` (soft delete for admin; explicit permanent mode for super admin)

### Distributors

- `GET /api/admin/distributors`
- `PATCH /api/admin/distributors/:id/status`

### Plantation Moderation

- `GET /api/admin/plantations`
- `GET /api/admin/plantations/:id`
- `PATCH /api/admin/plantations/:id/review`
- `PATCH /api/admin/progress-updates/:id/review`
- `POST /api/admin/plantations/:id/recalculate-fraud`
- `DELETE /api/admin/plantations/:id` (soft by default; permanent for super admin)

### Offices

- Existing `/api/admin/offices` and `/api/admin/offices/:id` routes remain and become audited.

### Rewards

- `GET/POST /api/admin/rewards`
- `PATCH/DELETE /api/admin/rewards/:id`
- `GET /api/admin/redemptions`
- `PATCH /api/admin/redemptions/:id/review`

### Analytics, Audits, Settings, And Admin Accounts

- `GET /api/admin/overview`
- `GET /api/admin/reports`
- `GET /api/admin/audit-logs`
- `GET/PATCH /api/admin/settings`
- `GET/POST /api/admin/admins` (super admin)
- `PATCH/DELETE /api/admin/admins/:id` (super admin)

## Error Handling

APIs return consistent JSON errors:

- `400` invalid transition, validation, missing reason, or confirmation mismatch
- `401` missing/invalid session
- `403` insufficient role, blocked status, pending password change, or pending distributor approval
- `404` missing target
- `409` duplicate action, stale transition, insufficient credits, or protected last-super-admin operation
- `503` database configuration/service failure

The UI displays loading, empty, permission-denied, validation, conflict, and database-error states without fabricated data.

## Testing And Verification

Implementation follows test-driven development. Required coverage includes:

- Full role-to-permission matrix.
- Database revalidation of role, status, password-change state, and session version.
- Public signup rejecting admin and super-admin roles.
- First-login password rotation and old-session invalidation.
- User moderation transitions and required reasons.
- Soft deletion, physical deletion authorization, and retained plantation/audit history.
- Distributor approval transitions.
- Plantation/progress moderation transitions.
- Fraud score boundaries, duplicate image detection, GPS proximity, rapid submissions, and admin-only exposure.
- Pending, approved, rejected, and flagged credit behavior.
- Milestone credit amounts and balance calculations.
- Reward CRUD, reservations, and redemption decisions.
- Transactional audit creation and immutable audit logs.
- Existing discovery, office, distributor, plantation, profile, and reward flows.
- Production TypeScript check, lint, tests, and Next.js build.
- Browser verification for super-admin login redirect, password change, admin access, user/distributor denial, moderation actions, office management, rewards, audits, and responsive layout.

## Initial Super-Admin Provisioning

A one-time script creates or upgrades the requested administrator account using the provided name and email and a bcrypt-hashed temporary password supplied through process environment variables. It sets:

- Role: `super_admin`
- Account status: `active`
- `must_change_password = true`
- Incremented `session_version`

The script is idempotent and never prints the password or hash. Production verification confirms login succeeds, the JWT subject/session is valid, `/change-password` is required, and privileged APIs remain blocked until rotation.

## Deployment Sequence

1. Run the full local test suite and production build.
2. Apply the idempotent PostgreSQL migration.
3. Seed default platform settings.
4. Run the one-time super-admin bootstrap script with temporary credentials supplied only at execution time.
5. Deploy the Next.js application to the linked Vercel production project.
6. Verify production login, forced password change, role permissions, moderation, audits, offices, rewards, and existing public flows.
7. Do not expose or retain the temporary password in source files, logs, screenshots, or final output.
