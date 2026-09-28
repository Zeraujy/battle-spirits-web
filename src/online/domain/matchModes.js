export const MatchMode = Object.freeze({
  CASUAL: "casual",
  RANKED: "ranked",
  FRIEND: "friend",
  PRIVATE: "private",
  LOCAL: "local",
  AI: "ai"
});

export const ONLINE_MATCH_MODES = Object.freeze([
  MatchMode.CASUAL,
  MatchMode.RANKED,
  MatchMode.FRIEND,
  MatchMode.PRIVATE
]);

export function isOnlineMatchMode(value) {
  return ONLINE_MATCH_MODES.includes(value);
}

export function normalizeMatchMode(value, fallback = MatchMode.CASUAL) {
  const candidate = String(value || "").trim().toLowerCase();
  return Object.values(MatchMode).includes(candidate) ? candidate : fallback;
}
