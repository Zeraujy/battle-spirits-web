# Source Architecture Cleanup

This maintenance pass reorganizes application-level source boundaries without changing gameplay behavior.

## Changes

- Moved the application shell to `src/app/App.jsx`.
- Moved application configuration to `src/app/config/`.
- Moved localization to `src/localization/`.
- Kept `src/main.jsx` as the single browser entry point.
- Removed the unused `src/game/devTools.js` helper after repository-wide reference checks confirmed it had no runtime or test consumers.
- Updated all affected imports and project verification paths.
- Added `scripts/audits/project/audit-source-architecture.mjs` to prevent legacy paths from returning.

## Runtime boundaries

The following directories were intentionally left unchanged in this pass:

- `public/`
- `server/`
- `supabase/`
- gameplay implementation inside `src/game/`
- online implementation inside `src/online/`

This keeps the cleanup structural and avoids mixing architecture maintenance with gameplay changes.
