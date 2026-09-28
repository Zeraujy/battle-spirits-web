export const SyncStatus = Object.freeze({
  UNKNOWN: "unknown",
  CURRENT: "current",
  STALE: "stale",
  AHEAD: "ahead"
});

export function normalizeStateVersion(value) {
  if (value == null || value === "") return null;
  const version = Number(value);
  return Number.isInteger(version) && version >= 0 ? version : null;
}

export function compareStateVersion(clientVersion, serverVersion) {
  const client = normalizeStateVersion(clientVersion);
  const server = normalizeStateVersion(serverVersion);
  if (client == null || server == null) return SyncStatus.UNKNOWN;
  if (client === server) return SyncStatus.CURRENT;
  return client < server ? SyncStatus.STALE : SyncStatus.AHEAD;
}

export function createClientSyncState(value = {}) {
  return {
    matchId: value.matchId ? String(value.matchId) : null,
    stateVersion: normalizeStateVersion(value.stateVersion),
    serverSequence: normalizeStateVersion(value.serverSequence),
    receivedAt: Number(value.receivedAt || 0) || null
  };
}

export function readSyncMetadata(payload) {
  const sync = payload?.matchSync || payload?.sync || payload || {};
  return createClientSyncState({
    matchId: sync.matchId,
    stateVersion: sync.stateVersion,
    serverSequence: sync.serverSequence,
    receivedAt: Date.now()
  });
}

export function acceptServerSync(current, payload) {
  const previous = createClientSyncState(current);
  const incoming = readSyncMetadata(payload);
  if (!incoming.matchId) return previous;
  if (previous.matchId && previous.matchId !== incoming.matchId) return incoming;
  if (incoming.serverSequence == null) return incoming;
  if (previous.serverSequence != null && incoming.serverSequence < previous.serverSequence) return previous;
  return incoming;
}
