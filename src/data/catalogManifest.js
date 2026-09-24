/**
 * Lightweight catalog metadata used by the Home screen.
 * Keeping the full card database out of Home avoids parsing hundreds of card
 * records before the user opens Deck Builder or starts a match.
 *
 * `npm run verify` checks the real database; update this number when importing
 * new cards.
 */
export const CATALOG_CARD_COUNT = 365;
