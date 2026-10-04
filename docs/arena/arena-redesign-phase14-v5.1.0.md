# Arena Redesign Phase 14 — Responsive and Touch Adaptation

Base: `battle-spirits-web-v5.1.0-arena-redesign-phase13.zip`

## Scope

Phase 14 implements the responsive and touch adaptation from the official Arena redesign roadmap while preserving the v5.1.0 Rules Engine and keeping the parallel Arena disconnected from the production route.

## Official viewport tiers

- Desktop Wide — 2560×1440 reference.
- Desktop — 1920×1080 reference.
- Laptop — 1366×768 reference.
- Tablet Landscape — 1024×768 reference.
- Mobile Landscape — approximately 844×390 reference.

The responsive profile is presentation-only. CSS remains responsible for layout and the React hook only exposes viewport/input profile markers to the Arena shell.

## Main changes

- Added `responsiveArenaPresentation.js` with deterministic presentation profiles for the five official reference sizes.
- Added `useArenaResponsiveProfile.js` to expose viewport and input markers without importing gameplay authority.
- Added dedicated CSS density rules for Desktop Wide, Laptop, Tablet Landscape and Mobile Landscape while keeping Desktop as the normal baseline.
- Primary content priority remains Opponent Hand, Opponent Field, Battle Focus, Player Field and Player Hand.
- Life, Reserve, Burst, Deck, Trash, Core Trash and Void compact progressively but remain reachable; the old compact breakpoint no longer removes Void in the Phase 14 profiles.
- At Mobile Landscape size the utility region reserves a narrow right column rather than overlaying the play surface.
- Card, Hand, Core, battle-focus and utility densities scale down without removing cards or game zones.
- Coarse-pointer controls receive larger touch targets and no longer depend on hover feedback.
- Hand cards now support touch/pen Pointer Events drag to the existing player Battlefield drop target and reuse the existing `onHandCardDrop` controller intent.
- Pointer cancellation clears temporary drop highlighting, and completed touch drag suppresses the follow-up click.
- Added `prefers-reduced-motion` handling for the parallel Arena.
- Updated in-game Patch Notes, Arena documentation and project history.

## Authority boundary

Phase 14 does not summon cards, validate legality, pay costs, move Cores, resolve effects or mutate match state. Touch drag only discovers the existing presentation drop target and emits the same controller-owned Hand drop intent already used by desktop drag/drop.

## Protected baseline comparison

Direct SHA-256 tree comparison against Phase 13 confirms the following remain byte-for-byte unchanged:

- `src/game/` — 113 files, 0 differences
- `src/online/` — 19 files, 0 differences
- `server/` — 49 files, 0 differences
- `supabase/` — 25 files, 0 differences
- `public/` — 1412 files, 0 differences
- `data/` — 36 files, 0 differences
- `src/features/arena/Simulator.jsx` — 1 file, 0 differences

Total protected comparison: 1655 files, 0 differences.

## QA

- Focused responsive/touch presentation tests: **3/3 PASS** (2 viewport/input profile tests + 1 touch drop-target test).
- `npm test`: **183/183 PASS**.
- `npm run verify`: **PASS**.
- Arena Redesign Phase 14 Responsive and Touch audit: **PASS**.
- All earlier Arena redesign audits: **PASS**.
- Full regression: **576/576 PASS across 101 test files**.
- UI audit: **PASS**.
- Release audit: **PASS**.
- Security audit: **PASS**.
- Documentation audit: **PASS — 28 active documents**.
- Card catalog: **1354 unique cards, 0 missing local artwork references**.

## Build note

`npm run build` was attempted but cannot execute in this source-only container because the Vite executable is not installed (`vite: not found`). The user's Windows environment remains the final build gate, consistent with the previous Arena redesign packages.
