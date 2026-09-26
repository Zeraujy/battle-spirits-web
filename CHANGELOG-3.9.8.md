# Battle Spirits Eternal Simulator v3.9.8 — Deckbuilder & Database 2.0

## Player-facing changes
- Catalog search now uses a precomputed searchable index and supports multi-term queries.
- Advanced filters: set, rarity, family, cost range, reduction, symbol and official restriction status.
- Sorting by code, name, cost or rarity.
- 21 cards per catalog page.
- Deck analytics: average cost, cost curve, color distribution and card-type distribution.
- Catalog cards display name, code, rarity and cost directly beneath the artwork.
- Card details suggest related cards using family, color, type, set and cost affinity.
- Advanced filters are collapsible and responsive to keep the main deckbuilding flow uncluttered.

## Internal quality
- Search text is normalized and cached once when the catalog loads.
- Added deck analytics unit coverage.
- Release, UI, backend-exposure and disposable-file audits remain part of the release flow.
