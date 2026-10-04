export function createArenaInteractionBus({ requestIntent } = {}) {
  const listeners = new Set();

  function emit(intent) {
    if (!intent || typeof intent.type !== "string") return false;
    for (const listener of listeners) listener(intent);
    requestIntent?.(intent);
    return true;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({ emit, subscribe });
}

export default createArenaInteractionBus;
