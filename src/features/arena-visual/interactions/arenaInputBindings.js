/**
 * Input-binding contract reserved for future keyboard / mouse shortcuts.
 *
 * The binding layer must only translate an input gesture into an Arena Visual
 * intent. It must never dispatch Rules Engine actions directly.
 */
export const ARENA_VISUAL_INPUT_SOURCES = Object.freeze([
  "ui",
  "pointer",
  "keyboard",
  "mouse",
  "touch",
  "pen"
]);

export function createArenaInputBinding({ id, input, gesture, intentType, enabled = true } = {}) {
  return Object.freeze({
    id: String(id || ""),
    input: ARENA_VISUAL_INPUT_SOURCES.includes(input) ? input : "ui",
    gesture: String(gesture || ""),
    intentType: String(intentType || ""),
    enabled: Boolean(enabled)
  });
}
