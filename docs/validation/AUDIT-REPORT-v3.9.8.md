# Battle Spirits Eternal Simulator v3.9.8 — Release Audit

## Scope
Release audit for Deckbuilder & Database 2.0, based on the audited v3.9.5 project baseline.

## New player-facing work
- Precomputed normalized catalog search index.
- Multi-term search across name, card number, family and effect text.
- Filters for type, color, set, rarity, family, cost range, reduction, symbol and restriction state.
- Sorting by card number, name, cost or rarity.
- 21 cards per catalog page.
- Deck cost curve, average cost, color distribution and card-type distribution.
- Catalog captions for card name, number, rarity and cost.
- Related-card suggestions in Card Details.
- Responsive advanced-filter layout with compact mobile fallback.

## Integrity
- Automated tests: 138/138 passed.
- Structural verifier v3: 61 essential files.
- Runtime catalog: 365 unique cards.
- Card artwork: 382 WebP files; 0 missing runtime artwork references.
- Source parse: 130 JS/JSX/MJS/CJS files; 0 syntax errors.
- Relative imports: 324 checked; 0 missing targets.

## Player-facing technical information
- `ui:audit`: PASS.
- `release:audit`: PASS.
- No new backend/service/configuration copy is exposed by Deckbuilder & Database 2.0.
- Error handling remains player-facing rather than provider-facing.

## Cleanup
The release package excludes development/runtime residue including:
- `.git/`
- `node_modules/`
- `dist/`
- `release/`
- private `.env` files
- logs, caches, temporary files and backups

`.env.example` templates remain available where appropriate.

## Build note
A fresh Vite production bundle was not created inside the audit container because the available dependency tree uses Windows-native Rolldown bindings. This release intentionally contains no stale `dist`; install dependencies and build on the target Windows development environment.
