# v4.2.0 — Collection, Shop & Dual Economy Foundation

## Player-facing changes

- New Store interface inspired by dedicated digital card-game shops while keeping the simulator's monochrome Eternal identity.
- Added a dual wallet display:
  - **Spirit Coins (SC):** Store currency for boosters, decks and future Store items.
  - **Craft Coins (CC):** crafting-only currency, never used for normal Store purchases.
- Added a Collection tab with total copies, unique cards and duplicate-copy counts.
- Added Store categories for Boosters, Decks and Accessories.
- Future accessories appear as unavailable while keeping their catalog slots ready.
- The economy remains gameplay-only and has no real-money purchase flow.

## Foundation

- Account-backed wallet and collection schema prepared for future match rewards, booster opening, trades and crafting.
- Client access is read-only for economy balances and owned cards; future mutations are reserved for trusted game services.
- Shop product catalog centralized in `src/data/shopCatalog.js`.
- Store artwork directory standardized at `public/assets/shop-items/`.
- Every Store thumbnail uses an exact **600 x 900 px (2:3)** canvas.

## Next economy milestones

- v4.2.1 — Booster Purchase & Pack Opening
- v4.2.2 — Player Trading
- v4.2.3 — Gameplay Rewards & Economy Balancing
- v4.2.4 — Card Crafting
- v4.2.5 — Cosmetics Foundation
