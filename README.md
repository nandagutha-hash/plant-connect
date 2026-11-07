# PlantConnect

PlantConnect is a Next.js App Router application for finding nearby government forest department nurseries and viewing live plant availability.

## Folder Structure

```text
src/app/                  App Router pages and API routes
src/components/           Layout, landing, auth, discovery, and dashboard UI
src/lib/                  Auth, validation, discovery, database, and repository logic
database/                 PostgreSQL schema and seed scripts
docs/superpowers/         Design spec and implementation plan
public/images/            Project image assets
```

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The app runs immediately without a database by using an in-memory demo repository. To use PostgreSQL, set `DATABASE_URL` and run:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```

## Scripts

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Frontend

- `src/components/landing/PlantConnectLanding.tsx` implements the premium hero, parallax forest image, floating leaves, stats panel, feature cards, how-it-works section, and map preview.
- `src/components/auth/AuthForm.tsx` implements signup and login with role selection.
- `src/components/discovery/DiscoveryClient.tsx` detects user location and ranks nearby distributors.
- `src/components/dashboard/DistributorDashboard.tsx` lets distributors add plants, upload image previews, update quantities, and edit profile/contact data.

## Backend

- `src/app/api/auth/*` handles signup, login, logout, and current session.
- `src/app/api/distributors/route.ts` returns nearby distributors with plant counts.
- `src/app/api/plants/*` handles plant listing, creation, and quantity updates.
- `src/app/api/profile/route.ts` updates distributor contact/profile details.
- `src/lib/repository.ts` is the persistence boundary. It uses PostgreSQL when `DATABASE_URL` exists and falls back to demo data otherwise.

## Database Schema

The database uses three tables:

- `users`: identity, password hash, and role.
- `distributors`: nursery profile, contact, and coordinates.
- `plants`: plant species, category, quantity, and image URL.

See `database/schema.sql` for the full schema.

## Notes

Plant image upload is implemented as a local browser preview and submitted as an image URL/data URL. For production deployment, connect that field to Supabase Storage, S3, or another object storage service and store the returned URL in `plants.image_url`.
