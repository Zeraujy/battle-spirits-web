# Testing and Audits

The project uses functional command names so permanent maintenance workflows do not depend on historical release phases.

## Core validation

- `npm test` — primary unit and integration test suite.
- `npm run verify` — structural, catalog, arena, online, effects, data and naming validation.
- `npm run regression:full` — complete regression suite across the game, online server and services.
- `npm run project:check` — full local release check, including the production build.

## Domain audits

- `npm run audit:arena` — arena integrity and presentation audits.
- `npm run audit:online` — authoritative online flow audits.
- `npm run audit:effects` — effect engine audits.
- `npm run source:audit` — source architecture boundaries.
- `npm run data:audit` — runtime/static data boundaries.
- `npm run naming:audit` — permanent script and test naming rules.
- `npm run ui:audit` — frontend exposure and UI audit.
- `npm run release:audit` — release package audit.
- `npm run security:audit` — client security audit.

## Naming rule

Permanent scripts and npm commands must use descriptive English names based on responsibility. Historical phase or release identifiers must not be used as permanent script filenames, test filenames, or npm command keys.
