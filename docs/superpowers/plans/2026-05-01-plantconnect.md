# PlantConnect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in this session. Subagents are not used because the user did not explicitly request delegation.

**Goal:** Build a complete runnable PlantConnect web application across setup, landing UI, auth, distributor management, user discovery, database schema, and polish.

**Architecture:** Use Next.js App Router with Tailwind CSS and Framer Motion. Route handlers expose auth, distributor discovery, plant management, and profile updates. PostgreSQL is supported through `pg`; a demo repository keeps the app usable without external setup.

**Tech Stack:** Next.js, React, Tailwind CSS, Framer Motion, PostgreSQL, `pg`, `jose`, `bcryptjs`, Zod, Vitest.

---

### Task 1: Project Setup

**Files:** `package.json`, config files, global layout, global CSS, docs.

- [ ] Create framework and tooling files.
- [ ] Add Tailwind, TypeScript, ESLint, Vitest, and environment config.
- [ ] Add docs/spec and docs/plan.

### Task 2: Tested Domain Logic

**Files:** `src/lib/discovery.ts`, `src/lib/auth.ts`, `src/lib/validators.ts`, tests.

- [ ] Write failing tests for distance ranking, role redirect paths, and validation.
- [ ] Run tests and confirm the modules are missing or failing.
- [ ] Implement the minimal domain code.
- [ ] Run tests again and confirm they pass.

### Task 3: Backend and Database

**Files:** `src/lib/db.ts`, `src/lib/repository.ts`, API routes, `database/schema.sql`, `database/seed.sql`.

- [ ] Implement PostgreSQL pool and demo fallback.
- [ ] Implement signup, login, logout, current user, distributor discovery, plant CRUD, and profile routes.
- [ ] Add SQL schema and seed data.

### Task 4: Frontend UI

**Files:** app pages and components under `src/components`.

- [ ] Implement responsive layout, navbar, and footer.
- [ ] Implement animated landing page with generated forest asset.
- [ ] Implement auth forms.
- [ ] Implement discovery page with geolocation and nearest distributor cards.
- [ ] Implement distributor dashboard with plant image upload preview, quantity updates, and profile editing.

### Task 5: Polish and Verification

**Files:** all app surfaces.

- [ ] Add loading and error states.
- [ ] Run tests, typecheck, lint, and build.
- [ ] Start the dev server.
- [ ] Verify desktop and mobile rendering plus the main interaction path.
