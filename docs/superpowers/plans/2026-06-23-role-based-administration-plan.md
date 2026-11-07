# PlantConnect Role-Based Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade PlantConnect into a database-driven, launch-ready four-role administration platform with immutable audit logging, moderation, fraud scoring, pending eco credits, reward governance, and a forced-rotation super-admin bootstrap.

**Architecture:** PostgreSQL remains authoritative for identity state, roles, moderation, credits, and settings. JWTs carry identity and session version only as signed session context; protected APIs rehydrate the user from PostgreSQL and enforce centralized permissions. Administrative mutations execute through transaction-aware repositories that append immutable audit entries in the same transaction.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL/Neon, `pg`, JWT via `jose`, bcrypt, Zod, React, Tailwind CSS, Vitest, Vercel.

---

## File Structure

New focused modules:

- `database/migrations/005_role_based_administration.sql` - idempotent schema/data migration and immutable audit trigger.
- `src/lib/permissions.ts` - typed roles, permissions, and permission matrix.
- `src/lib/adminTypes.ts` - admin DTOs and moderation states.
- `src/lib/requestSecurity.ts` - strict same-origin validation for cookie-authenticated mutations.
- `src/lib/fraudDetection.ts` - deterministic fraud score calculation and labels.
- `src/lib/adminRepository.ts` - transaction-safe moderation, audit, settings, reward, office, and analytics operations.
- `src/lib/adminSession.ts` - database-authoritative current-user and permission checks.
- `src/components/admin/AdminShell.tsx` - existing-design admin navigation shell.
- `src/components/admin/AdminPortalClient.tsx` - data-driven administration views and actions.
- `scripts/bootstrap-super-admin.mjs` - secure idempotent bootstrap using environment variables.

Existing modules updated:

- `database/schema.sql`, `database/seed.sql`
- `src/lib/types.ts`, `src/lib/auth.ts`, `src/lib/session.ts`, `src/lib/repository.ts`, `src/lib/ecoRepository.ts`, `src/lib/validators.ts`
- Auth, eco, office, plant, profile, and new admin API route handlers
- `src/app/admin/**`, `src/app/change-password/page.tsx`, navbar routing

## Task 1: Database Migration And Retention

**Files:**
- Create: `database/migrations/005_role_based_administration.sql`
- Modify: `database/schema.sql`
- Test: migration smoke query against a disposable transaction and production schema introspection

- [ ] Add `super_admin` to `user_role` idempotently.
- [ ] Add user account status, password-rotation, session-version, moderation reason/time/actor, deletion, and snapshot fields.
- [ ] Add distributor approval status and review metadata.
- [ ] Add `plantation_status`, notes, fingerprint, fraud score/signals, review metadata, and soft-deletion fields to plantations.
- [ ] Add progress GPS, notes, fingerprint, fraud score/signals, moderation state, user reference, and review metadata.
- [ ] Add pending/approved/rejected state and reviewer metadata to eco credits; migrate legacy rows to approved.
- [ ] Add reward state/update/deletion fields and redemption review/reservation fields.
- [ ] Replace destructive historical foreign keys with nullable `ON DELETE SET NULL` constraints.
- [ ] Replace DFO legacy public-state fields with `office_status`, `full_address`, and `working_hours`, migrating existing verified records safely.
- [ ] Create `platform_settings` with fraud thresholds and daily credit limit defaults.
- [ ] Create append-only `audit_logs` with nullable references plus actor/target snapshots.
- [ ] Create a trigger that rejects audit update/delete operations.
- [ ] Add indexes for role/status search, moderation queues, fraud fingerprints, GPS/time queries, credits, redemptions, offices, and audits.
- [ ] Run the migration twice and verify idempotency.

## Task 2: Central RBAC And Database-Revalidated Sessions

**Files:**
- Create: `src/lib/permissions.ts`
- Create: `src/lib/adminSession.ts`
- Create: `src/lib/requestSecurity.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/session.ts`
- Modify: `src/lib/repository.ts`
- Test: `src/lib/permissions.test.ts`, `src/lib/adminSession.test.ts`, `src/lib/requestSecurity.test.ts`

- [ ] Write failing role-matrix tests covering all four roles and privileged permissions.
- [ ] Implement typed permissions and inheritance without route-local role duplication.
- [ ] Write failing tests proving JWT role alone cannot authorize a request.
- [ ] Add `findSessionUserById()` and rehydrate role, account status, session version, password state, and distributor approval from PostgreSQL.
- [ ] Include `sessionVersion` in JWTs and reject stale tokens.
- [ ] Add `requirePermission()` and distributor approval enforcement.
- [ ] Add strict Origin/Host validation for state-changing same-origin requests.
- [ ] Preserve secure session cookie settings and existing login behavior.
- [ ] Run focused tests, then the full suite.

## Task 3: Forced Password Rotation

**Files:**
- Create: `src/app/api/auth/change-password/route.ts`
- Create: `src/app/change-password/page.tsx`
- Create: `src/components/auth/ChangePasswordForm.tsx`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/me/route.ts`
- Modify: `src/lib/validators.ts`
- Test: `src/app/api/auth/changePasswordRoute.test.ts`

- [ ] Write failing tests for required current password, strong replacement password, database update, session-version rotation, and new cookie issuance.
- [ ] Redirect `must_change_password` sessions to `/change-password`.
- [ ] Block privileged and normal protected APIs until rotation, except session inspection, logout, and password change.
- [ ] Implement password change with bcrypt cost 12, `password_changed_at`, `must_change_password=false`, and incremented session version.
- [ ] Preserve the existing authentication UI styling.

## Task 4: Immutable Audit Transaction Layer

**Files:**
- Create: `src/lib/adminTypes.ts`
- Create: `src/lib/adminRepository.ts`
- Test: `src/lib/adminRepository.test.ts`

- [ ] Write failing tests that administrative mutations roll back when audit insertion fails.
- [ ] Implement a shared PostgreSQL transaction helper.
- [ ] Implement `appendAuditLog()` with actor/target snapshots, action, required reason, and JSON metadata.
- [ ] Implement paginated audit listing: admins see their own logs; super admins see all logs.
- [ ] Verify no application update/delete audit function exists.

## Task 5: User And Administrator Governance

**Files:**
- Create API routes under `src/app/api/admin/users/**` and `src/app/api/admin/admins/**`
- Modify: `src/lib/adminRepository.ts`, `src/lib/validators.ts`
- Test: route and repository tests

- [ ] Add paginated user search with role/status filters and real activity counts.
- [ ] Implement active/suspended/banned/deleted transitions with mandatory reasons and audit logs.
- [ ] Implement soft deletion for admins.
- [ ] Implement super-admin permanent deletion with exact-email confirmation, mandatory reason, retained histories, and audit snapshots.
- [ ] Implement admin creation, promotion, demotion, and removal for super admins only.
- [ ] Prevent removal/demotion of the last active super admin.
- [ ] Increment session versions on role/status/security changes.

## Task 6: Distributor Moderation

**Files:**
- Create: `src/app/api/admin/distributors/route.ts`
- Create: `src/app/api/admin/distributors/[id]/status/route.ts`
- Modify signup/session/repository logic
- Test: distributor moderation tests

- [ ] Default new distributors to pending.
- [ ] Implement approve/reject/suspend/restore transitions with reviewer, timestamp, reason, and audit.
- [ ] Block non-approved distributors from distributor mutation APIs.
- [ ] Preserve public distributor discovery behavior for approved profiles only.

## Task 7: Fraud Scoring And Plantation Moderation

**Files:**
- Create: `src/lib/fraudDetection.ts`
- Create admin plantation/progress API routes
- Modify eco upload routes and repositories
- Test: `src/lib/fraudDetection.test.ts`, moderation route/repository tests

- [ ] Write failing fraud tests for same-user duplicate image +35, cross-user duplicate +60, repeated GPS +25, rapid uploads +20, capping at 100, and labels at 30/31/60/61.
- [ ] Compute SHA-256 fingerprints server-side from submitted image data/URL text without exposing them publicly.
- [ ] Store plant type, optional notes, GPS, timestamp, score, and machine-readable signals.
- [ ] Default plantation/progress submissions to pending and create matching pending credit rows.
- [ ] Implement under-review, approve, reject, and flag transitions.
- [ ] Require reasons for reject and flag.
- [ ] Never auto-reject based on score.
- [ ] Ensure fraud fields appear only in admin DTOs.
- [ ] Soft-delete fraudulent plantations for admins and reserve permanent deletion for super admins.

## Task 8: Approved Credits And Daily Abuse Limit

**Files:**
- Modify: `src/lib/ecoCredits.ts`, `src/lib/ecoRepository.ts`, eco profile/rewards APIs
- Test: `src/lib/ecoCredits.test.ts`, `src/lib/ecoRepository.test.ts`

- [ ] Define canonical milestones: Initial 50, 15-day 50, 30-day 100, 60-day 150, 90-day 250, mature 400.
- [ ] Count only approved credits in balances, levels, affordability, and analytics.
- [ ] Keep rejected credits in history at zero eligibility.
- [ ] Keep flagged submissions' credit rows pending.
- [ ] Enforce the database-backed 500-credit UTC daily approval limit transactionally.
- [ ] Return 409 and leave credit pending when an approval would exceed the limit.
- [ ] Preserve legacy approved milestone history.

## Task 9: Rewards And Redemptions

**Files:**
- Create admin reward/redemption API routes
- Modify public reward/redemption repository and APIs
- Test reward management and reservation behavior

- [ ] Implement active/inactive/deleted reward state with admin CRUD and audit.
- [ ] Hide inactive/deleted rewards from normal users.
- [ ] Create pending redemptions that reserve credits.
- [ ] Prevent pending reservation overspending transactionally.
- [ ] Approve redemptions to finalize deductions.
- [ ] Reject with mandatory reason and release reservations.
- [ ] Allow permanent reward deletion only for super admins when retention constraints permit it.

## Task 10: DFO Office Status And Discover Compatibility

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/repository.ts`, office validators/routes/components
- Test: DFO repository and discovery tests

- [ ] Replace public filtering with `office_status='verified'`.
- [ ] Support pending, inactive, closed, and verified admin states.
- [ ] Map `full_address` and `working_hours` to existing unchanged UI fields.
- [ ] Preserve Haversine distance ranking, cards, OpenStreetMap, and Google directions behavior.
- [ ] Audit office creation, editing, verification/state changes, soft deletion, and permanent deletion.
- [ ] Confirm no placeholder or fabricated office fallback is introduced.

## Task 11: Analytics, Reports, Settings, And Admin UI

**Files:**
- Create overview/reports/settings API routes
- Create admin layout/pages/components under `src/app/admin` and `src/components/admin`
- Modify existing `AdminOfficesClient.tsx` only where required for shared shell/status fields
- Test admin component access/error states

- [ ] Implement real aggregate queries for users, distributors, offices, verified/pending offices, plantations, pending/flagged reviews, approved credits, and approved redemptions.
- [ ] Implement super-admin settings reads/writes with audit logs.
- [ ] Add a server-protected admin layout and existing-design navigation.
- [ ] Build Overview, Users, Distributors, Offices, Plantation Verification, Rewards, Reports, Audit Logs, and Settings views.
- [ ] Display fraud warnings only in admin moderation views.
- [ ] Preserve current typography, colors, spacing, responsiveness, loading, empty, and error states.
- [ ] Use no demo numbers, placeholder records, mock users, or fabricated offices.

## Task 12: Super-Admin Bootstrap

**Files:**
- Create: `scripts/bootstrap-super-admin.mjs`
- Modify: `package.json`
- Test: script validation/idempotency test

- [ ] Require name, email, and temporary password from environment variables.
- [ ] Hash with bcrypt cost 12 and never print password/hash.
- [ ] Create or safely upgrade the target account to active super admin.
- [ ] Set `must_change_password=true` and initialize/increment session version.
- [ ] Write an audit/bootstrap record without exposing credentials.
- [ ] Refuse weak/missing credentials.

## Task 13: Full Verification And Production Readiness

**Files:**
- Update tests only as required by verified behavior
- No production demo-data files

- [ ] Run focused tests after each TDD cycle.
- [ ] Run `npm run lint` and fix all findings.
- [ ] Run `npm run test` and require all tests passing.
- [ ] Run `npm run typecheck` and require exit 0.
- [ ] Run `npm run build` and require exit 0.
- [ ] Apply migration to Neon and verify schema constraints/indexes/status mappings.
- [ ] Run the bootstrap script using execution-time environment values.
- [ ] Verify login returns a forced password-change redirect and privileged APIs reject the temporary session.
- [ ] Deploy to linked Vercel production project.
- [ ] Browser-test super-admin password rotation, role denial, moderation, fraud warnings, credits, rewards, offices, audit logs, dashboard metrics, Discover, and responsive rendering.
- [ ] Verify the public site and existing user/distributor flows remain functional.

## Execution Notes

The current project directory is not a Git repository, so commit steps cannot be performed. Verification evidence will use fresh command output, database queries, API responses, and browser checks. No production users, plantations, distributors, rewards, or offices will be fabricated during implementation or testing.

