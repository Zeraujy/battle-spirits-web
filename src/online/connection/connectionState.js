import { PlayerConnectionState } from "../domain/matchStatus.js";

export function normalizeConnectionState(value) {
  return Object.values(PlayerConnectionState).includes(value)
    ? value
    : PlayerConnectionState.DISCONNECTED;
}

export function isConnectionRecoverable(value) {
  const state = normalizeConnectionState(value);
  return state === PlayerConnectionState.DISCONNECTED || state === PlayerConnectionState.RECONNECTING;
}

export function connectionLabel(value) {
  const state = normalizeConnectionState(value);
  if (state === PlayerConnectionState.CONNECTED) return "Connected";
  if (state === PlayerConnectionState.RECONNECTING) return "Reconnecting";
  if (state === PlayerConnectionState.TIMED_OUT) return "Timed out";
  if (state === PlayerConnectionState.LEFT) return "Left";
  return "Disconnected";
}
