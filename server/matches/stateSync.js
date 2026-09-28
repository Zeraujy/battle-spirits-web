import { compareStateVersion, normalizeStateVersion, SyncStatus } from "../../src/online/sync/stateSync.js";

export const SERVER_SYNC_PROTOCOL_VERSION = 1;

export function createStateEnvelope(session, { gameState = session?.gameState ?? null } = {}) {
  if (!session) return null;
  return {
    protocolVersion: SERVER_SYNC_PROTOCOL_VERSION,
    matchId: session.matchId,
    stateVersion: session.stateVersion,
    serverSequence: session.serverSequence,
    status: session.status,
    updatedAt: session.lastUpdatedAt,
    gameState
  };
}

export function validateClientStateVersion(session, clientVersion) {
  if (!session) return { ok: false, status: SyncStatus.UNKNOWN, error: "MatchSession unavailable." };
  const normalized = normalizeStateVersion(clientVersion);
  if (normalized == null) return { ok: true, status: SyncStatus.UNKNOWN };
  const status = compareStateVersion(normalized, session.stateVersion);
  return {
    ok: status === SyncStatus.CURRENT,
    status,
    stateVersion: session.stateVersion,
    serverSequence: session.serverSequence
  };
}
