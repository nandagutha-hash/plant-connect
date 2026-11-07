# PlantConnect Design Spec

**Goal:** Build a production-ready Next.js App Router application that helps users discover nearby government plant distributors and lets distributors manage plant availability.

**Architecture:** PlantConnect uses a Next.js app with server-side API routes, typed validation, JWT cookie sessions, PostgreSQL persistence through `pg`, and a demo in-memory repository when `DATABASE_URL` is not configured. UI is divided into landing, authentication, discovery, and distributor dashboard surfaces.

**Core Experience:** The first viewport is an image-led forest hero with a sticky glass navbar, dark gradient overlay, Framer Motion zoom/parallax, floating leaves, a CTA, and a stats panel. Downstream sections cover feature cards, a three-step flow, and an OpenStreetMap preview. Auth is role-based: users land on `/discover`; distributors land on `/dashboard`.

**Data Model:** `users` owns login identity and role. `distributors` stores nursery profile, contact, and coordinates. `plants` stores availability, category, quantity, and image URL per distributor.

**Implementation Boundaries:** API routes call repository functions only. Components are split by feature area. Shared domain logic lives under `src/lib` and has Vitest coverage for discovery ranking, role redirects, and validation.

**Verification:** Run `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Launch the dev server and verify landing, auth, discovery, and distributor dashboard flows on desktop and mobile widths.
