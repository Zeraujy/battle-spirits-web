# Script and data layout

The permanent project structure uses purpose-based directories instead of development-phase folders at the repository root.

## Scripts

- `scripts/audits/` contains static and integrity audits grouped by subsystem.
- `scripts/regression/` contains broad regression runners.
- `scripts/deployment/` contains deployment preflight tooling.
- `scripts/maintenance/` contains one-off project maintenance utilities.
- `scripts/project/` contains project-wide verification tools.
- `scripts/online/` contains online configuration checks.
- `scripts/effects/` and `scripts/card-db/` remain domain-specific toolsets.

Legacy npm command names are retained where they are useful for compatibility, while stable aliases such as `audit:arena`, `audit:online`, `audit:effects`, and `regression:full` are available for future maintenance.

## Data

Effect data now lives below `data/effects/`:

- `coverage.json` — current effect coverage snapshot.
- `regression-scenarios.json` — current generated regression scenarios.
- `migrations/` — retained migration reports and inputs.
- `history/` — historical coverage snapshots required by regression tests.

## Database

SQL history remains under `supabase/` and is separated into `migrations/economy`, `migrations/social`, and `migrations/security`. Historical notes live in `supabase/docs`.
