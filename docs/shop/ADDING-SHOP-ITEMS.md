# Adding Shop Items

The Store catalog lives in `src/data/shopCatalog.js`.

## Artwork path

Place Store artwork in:

`public/assets/shop-items/`

Use one of these subfolders:

- `public/assets/shop-items/boosters/`
- `public/assets/shop-items/decks/`
- `public/assets/shop-items/accessories/`

## Exact artwork dimensions

All Store product thumbnails must be **600 x 900 pixels (2:3)**.

This is the canonical Store thumbnail size. Do not mix different canvas ratios in the catalog.

Recommended format: `.webp`.

The UI uses `object-fit: contain`, so transparent product renders work well. Keep essential artwork roughly 48 px away from each edge so labels or framing are not visually crowded.

## Catalog entry

Example:

```js
{
  id: "booster-bs08",
  category: "boosters",
  setCode: "BS08",
  title: "BS08",
  subtitlePT: "Booster Pack",
  subtitleEN: "Booster Pack",
  spiritPrice: 300,
  artwork: "/assets/shop-items/boosters/bs08.webp",
  status: "preview"
}
```

`Spirit Coins` are the Store currency. `Craft Coins` are reserved for the crafting system and must not be used as Store prices.

Current status values:

- `preview` - item is visible in the Store but purchasing is not active yet
- `unavailable` - future item/category placeholder

Purchasing and booster opening are scheduled for the next economy update.

---

## v4.2.1 — Real catalog integration

The current catalog is centralized in `src/data/shopCatalog.js`. Every database product is represented in the Shop, including items whose structured deck recipe is not yet complete.

Expected artwork filenames (600×900, preferably WebP):

**Boosters**
`bs01.webp`, `bs02.webp`, `bs03.webp`, `bs04.webp`, `bs05.webp`, `bs06.webp`, `bs07.webp`, `bs13.webp`, `bsc49.webp`, `pc01.webp`, `pc02.webp`

**Decks**
`sd01.webp`, `sd02.webp`, `sd03.webp`, `sd10.webp`, `sd11.webp`, `sd13.webp`, `sd14.webp`, `sd15.webp`, `sd16.webp`, `sd17.webp`, `sd19.webp`, `sd20.webp`, `sd22.webp`, `sd23.webp`, `sd28.webp`, `sd64.webp`

A missing thumbnail is safe: the Shop falls back to its placeholder without breaking the product card or modal.

Deck products should only be marked `status: "active"` after their exact structured recipe can be resolved against the unified card catalog. Use `status: "catalog-only"` for a product that should appear in the Shop but must not yet be purchased or selected as a starter.


---

## v4.2.2 — Saga grouping and reveal behavior

Saga/era metadata is centralized in `src/data/shopSagas.js`. Product entries in `src/data/shopCatalog.js` receive a `sagaId`, allowing Boosters and Decks to be filtered without hard-coding UI buttons.

Current catalog groups include `wanderer-lolo`, `constellation`, `sword-blade`, `ultimate-battle`, `contract`, and `supplementary`. Main-set grouping follows the Card Sets reference; non-main products are associated with their release era or kept under Supplementary Sets.

Products containing cards must open the reveal sequence after a successful purchase. Purchase grant events should include `before`, `after`, `duplicate`, `overflow`, `craftAwarded`, `unitIndex`, and `slotIndex` whenever possible.

- `before === 0`: show `NEW!` and `GET ×1`.
- `before > 0`: hide `NEW!` and show the Craft Coins generated.
- `overflow === true`: keep ownership at 6/6 and mark the extra copy as converted to Craft Coins.

`PC01` and `PC02` are fixed-content `card-set` products, not random boosters. `BSC49` uses 9 cards per pack.
