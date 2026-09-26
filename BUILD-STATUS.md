# Build Status — Battle Spirits Eternal Simulator v3.9.8

## Release state
- Deckbuilder & Database 2.0 implemented.
- Catalog search index, advanced filters, related-card suggestions and deck analytics active.
- 21 cards per catalog page with responsive layout safeguards.
- Patch Notes and version markers synchronized to v3.9.8.

## Validation
- Automated tests: 138/138 PASS.
- `npm run verify:v3`: PASS — 61 essential files.
- `npm run verify`: PASS — 365 runtime cards, 382 WebP artworks, 0 missing artwork references.
- `npm run ui:audit`: PASS.
- `npm run release:audit`: PASS.
- Syntax parse: 130 JS/JSX/MJS/CJS files, 0 errors.
- Relative import check: 324 imports, 0 missing targets.

## Build note
A fresh Vite bundle was not generated in this Linux audit environment because the available dependency tree was created on Windows and its Rolldown native binding is platform-specific. The release ZIP intentionally contains no `node_modules` and no stale `dist`. Run `npm install` and `npm run build` on the Windows development machine.
