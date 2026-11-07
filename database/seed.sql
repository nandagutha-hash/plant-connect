-- Production seed entrypoint.
-- Rewards are platform configuration. DFO offices are verified public discovery records.
-- This intentionally does not create users, plantations, distributors, plants, credits, or redemptions.
-- Those records must come from authenticated user actions.

\i database/seed_eco_rewards.sql
\i database/seed_dfo_offices.sql
