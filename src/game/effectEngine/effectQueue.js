export const EffectQueueStatus = Object.freeze({
  IDLE: "idle",
  RESOLVING: "resolving",
  WAITING_FOR_CHOICE: "waitingForChoice",
  COMPLETED: "completed"
});

function baseQueue(queue = {}) {
  return {
    status: queue.status || EffectQueueStatus.IDLE,
    nextSequence: Math.max(1, Number(queue.nextSequence || 1)),
    items: Array.isArray(queue.items) ? [...queue.items] : [],
    currentItemId: queue.currentItemId || null,
    completedCount: Math.max(0, Number(queue.completedCount || 0))
  };
}

export function getEffectQueue(match = {}) {
  return baseQueue(match.effectQueue || {});
}

export function withEffectQueue(match, queue) {
  return { ...match, effectQueue: baseQueue(queue) };
}

export function makeEffectQueueItem(queue, payload, kind = "event") {
  const sequence = Math.max(1, Number(queue.nextSequence || 1));
  return {
    id: `effect-${sequence}`,
    sequence,
    kind,
    payload
  };
}

export function enqueueEffectQueueItems(match, payloads = [], kind = "event") {
  let queue = getEffectQueue(match);
  const added = [];
  for (const payload of payloads) {
    if (!payload) continue;
    const item = makeEffectQueueItem(queue, payload, kind);
    queue = {
      ...queue,
      nextSequence: item.sequence + 1,
      items: [...queue.items, item]
    };
    added.push(item);
  }
  if (match.pendingEffectDecision && queue.items.length) {
    queue = { ...queue, status: EffectQueueStatus.WAITING_FOR_CHOICE };
  }
  return { match: withEffectQueue(match, queue), added };
}

export function enqueueEffectEvents(match, events = []) {
  return enqueueEffectQueueItems(match, events, "event");
}

export function markEffectQueueWaiting(match) {
  const queue = getEffectQueue(match);
  return withEffectQueue(match, {
    ...queue,
    status: queue.items.length ? EffectQueueStatus.WAITING_FOR_CHOICE : EffectQueueStatus.IDLE,
    currentItemId: null
  });
}

export function drainEffectQueue(match, resolver) {
  if (typeof resolver !== "function") throw new TypeError("Effect Queue resolver must be a function.");
  let next = match;
  let queue = getEffectQueue(next);
  const results = [];

  if (next.pendingEffectDecision) {
    next = markEffectQueueWaiting(next);
    return { match: next, results, processed: 0, waiting: true };
  }

  while (queue.items.length) {
    const [item, ...remaining] = queue.items;
    queue = { ...queue, status: EffectQueueStatus.RESOLVING, currentItemId: item.id, items: remaining };
    next = withEffectQueue(next, queue);

    const result = resolver(next, item) || { match: next };
    next = result.match || next;
    results.push({ item, result });

    queue = getEffectQueue(next);
    queue = {
      ...queue,
      currentItemId: null,
      completedCount: queue.completedCount + 1
    };

    if (next.pendingEffectDecision) {
      next = withEffectQueue(next, {
        ...queue,
        status: EffectQueueStatus.WAITING_FOR_CHOICE
      });
      return { match: next, results, processed: results.length, waiting: true };
    }

    next = withEffectQueue(next, {
      ...queue,
      status: queue.items.length ? EffectQueueStatus.RESOLVING : EffectQueueStatus.COMPLETED
    });
    queue = getEffectQueue(next);
  }

  next = withEffectQueue(next, { ...queue, status: EffectQueueStatus.IDLE, currentItemId: null });
  return { match: next, results, processed: results.length, waiting: false };
}

export function clearEffectQueue(match) {
  const queue = getEffectQueue(match);
  return withEffectQueue(match, {
    ...queue,
    status: EffectQueueStatus.IDLE,
    items: [],
    currentItemId: null
  });
}
