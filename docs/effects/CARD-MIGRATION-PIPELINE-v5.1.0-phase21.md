# Phase 21 — Card Migration Pipeline

The migration pipeline converts legacy/descriptive card records into executable Effect Schema v2 data without adding card-ID branches to the reducer.

## Commands

```bash
npm run effects:migrate -- --set=SD19
npm run effects:migrate -- --set=SD19 --write
npm run effects:audit
```

The first command is a dry-run. `--write` validates new Schema v2 abilities and updates `src/data/cards.json`. A migration receipt is written under `data/effects/migrations/`.

## Safety gates

- Descriptive effects can point to an executable ability through `automationRef`.
- Engine-native rules such as Summoning Condition and Ultimate Trigger are audited as native automation rather than false manual fallbacks.
- Migration definitions are data-driven and live in `scripts/effects/migrations/`.
- Cards lacking complete runtime gameplay data are never labeled automated merely because a Shop recipe or image exists.
