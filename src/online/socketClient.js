import { io } from "socket.io-client";
import { ONLINE_PROFILE_MAX_JSON_CHARS } from "./publicProfile.js";
import { acceptServerSync, createClientSyncState } from "./sync/stateSync.js";


function validateRoomPayload(payload) {
  try {
    const profileSize = JSON.stringify(payload?.profile || {}).length;
    if (profileSize > ONLINE_PROFILE_MAX_JSON_CHARS) {
      return "Perfil Online muito grande. O avatar foi bloqueado para evitar desconexão; tente novamente.";
    }
  } catch {
    return "Perfil Online inválido.";
  }
  return null;
}

function normalizeServerUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/health$/i, "");
}

function createBrowserOnlineClient(serverUrl) {
  const url = normalizeServerUrl(serverUrl);

  // Transporte da base 2.0.x que o projeto já usava com sucesso no navegador:
  // WebSocket preferencial, com fallback automático para polling.
  const socket = io(url, {
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    randomizationFactor: 0.35,
    timeout: 10000
  });

  let session = null;
  let syncState = createClientSyncState();
  let hasConnectedOnce = false;

  function captureSync(value) {
    if (!value) return syncState;
    syncState = acceptServerSync(syncState, value.state || value);
    return syncState;
  }

  socket.on("room:state", (state) => {
    captureSync(state);
  });

  socket.on("connect", () => {
    if (hasConnectedOnce && session) {
      socket.emit("room:resume", session, (result) => {
        if (result?.ok) captureSync(result);
      });
    }
    hasConnectedOnce = true;
  });

  function captureSession(result) {
    if (result?.ok && result.code && result.playerId && result.resumeToken) {
      session = { code: result.code, playerId: result.playerId, resumeToken: result.resumeToken };
    }
    if (result?.ok) captureSync(result);
  }

  return {
    socket,
    connect() { if (!socket.connected) socket.connect(); },
    disconnect() { socket.disconnect(); },
    close() { socket.disconnect(); },
    createRoom(payload, callback) {
      const error = validateRoomPayload(payload);
      if (error) return callback?.({ ok: false, error });
      socket.emit("room:create", payload, (result) => { captureSession(result); callback?.(result); });
    },
    joinRoom(payload, callback) {
      const error = validateRoomPayload(payload);
      if (error) return callback?.({ ok: false, error });
      socket.emit("room:join", payload, (result) => { captureSession(result); callback?.(result); });
    },
    startRoom(payload, callback) { socket.emit("room:start", payload, callback); },
    action(payload, callback) {
      const versionedPayload = syncState.stateVersion == null
        ? payload
        : { ...payload, stateVersion: syncState.stateVersion };
      socket.emit("game:action", versionedPayload, (result) => {
        if (result?.matchSync || result?.state) captureSync(result);
        callback?.(result);
      });
    },
    sendChat(text, callback) { socket.emit("room:chat", { text }, callback); },
    concede(callback) {
      socket.emit("match:concede", {}, (result) => {
        if (result?.matchSync || result?.state) captureSync(result);
        callback?.(result);
      });
    },
    resume(callback) {
      if (!session) return callback?.({ ok: false, error: "Sem sessão para retomar." });
      socket.emit("room:resume", session, (result) => {
        if (result?.ok) captureSync(result);
        callback?.(result);
      });
    },
    getSession() { return session ? { ...session } : null; },
    getSyncState() { return { ...syncState }; },
    adoptSession(value) {
      if (value?.code && value?.playerId && value?.resumeToken) session = { code: value.code, playerId: value.playerId, resumeToken: value.resumeToken };
      captureSync(value);
    }
  };
}

export function createOnlineClient(serverUrl) {
  return createBrowserOnlineClient(serverUrl);
}
