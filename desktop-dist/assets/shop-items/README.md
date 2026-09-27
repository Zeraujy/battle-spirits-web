# Shop item artwork

This folder contains the artwork thumbnails displayed by the in-game Store.

## Required size

Every Store product thumbnail MUST use this exact canvas size:

- Width: **600 px**
- Height: **900 px**
- Aspect ratio: **2:3**

Recommended format: **WebP**. PNG is also supported when transparency is needed.

The Store uses `object-fit: contain`, but keeping every thumbnail at 600x900 prevents layout jumps and makes future products consistent.

Keep the important part of the product inside a safe area of about 48 px from every edge.

## Directories

- `boosters/` - booster packs and premium card sets
- `decks/` - starter decks / structure decks
- `accessories/` - Store thumbnails for sleeves, playmats and future cosmetics

The thumbnail itself is always 600x900, even when the final cosmetic asset (for example a playmat texture) uses another resolution elsewhere in the game.

## Naming

Use lowercase file names without spaces whenever possible, for example:

- `boosters/bs01.webp`
- `boosters/pc01.webp`
- `decks/sd64.webp`
- `accessories/eternal-sleeve-01.webp`

Product paths are registered in `src/data/shopCatalog.js`.
