# Database migrations

This directory contains the SQL migration history used by the project.

- `migrations/economy/` — economy, onboarding, starter deck and shop migrations.
- `migrations/social/` — profile, social hub and social setup migrations.
- `migrations/security/` — database security migrations.
- `docs/` — historical migration notes retained for maintenance.

Migration history is preserved intentionally so a database can be reconstructed or audited without relying on obsolete root-level files.
