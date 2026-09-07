import { io } from "socket.io-client";

function normalizeServerUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/health$/i, "");
}

function hasDesktopOnlineBridge() {
  const bridge = typeof window !== "undefined" ? window.battleSpiritsDesktop : null;
  return Boolean(
    bridge?.isDesktop &&
    bridge?.onlineCreateClient &&
    bridge?.onlineConnect &&
    bridge?.onlineEmit &&
    bridge?.onOnlineEvent
  );
}

function createEventProxy() {
  const listeners = new Map();
  let connected = false;

  return {
    get connected() { return connected; },
    setConnected(value) { connected = Boolean(value); },
    on(eventName, listener) {
      if (typeof listener !== "function") return this;
      if (!listeners.has(eventName)) listeners.set(eventName, new Set());
      listeners.get(eventName).add(listener);
      return this;
    },
    off(eventName, listener) {
      if (!listeners.has(eventName)) return this;
      if (listener) listeners.get(eventName).delete(listener);
      else listeners.delete(eventName);
      return this;
    },
    dispatch(eventName, payload) {
      for (const listener of listeners.get(eventName) || []) {
        try { listener(payload); }
        catch (error) { console.error(`[online:${eventName}]`, error); }
      }
    },
    clear() { listeners.clear(); }
  };
}

function createDesktopOnlineClient(serverUrl) {
  const bridge = window.battleSpiritsDesktop;
  const url = normalizeServerUrl(serverUrl);
  const socket = createEventProxy();
  let clientId = null;
  let session = null;
  let hasConnectedOnce = false;
  let closed = false;

  const ready = bridge.onlineCreateClient(url).then((result) => {
    if (!result?.ok || !result.clientId) {
      throw new Error(result?.error || "Não foi possível criar a conexão online do Electron.");
    }
    clientId = result.clientId;
    return clientId;
  });

  const stopEvents = bridge.onOnlineEvent((message) => {
    if (!message || !clientId || message.clientId !== clientId) return;

    if (message.event === "connect") {
      socket.setConnected(true);
      socket.dispatch("connect");
      if (hasConnectedOnce && session) {
        bridge.onlineEmit(clientId, "room:resume", session).catch(() => {});
      }
      hasConnectedOnce = true;
      return;
    }

    if (message.event === "disconnect") {
      socket.setConnected(false);
      socket.dispatch("disconnect", message.payload?.reason || message.payload || "transport close");
      return;
    }

    if (message.event === "connect_error") {
      socket.dispatch("connect_error", { message: message.payload?.message || "connection error" });
      return;
    }

    socket.dispatch(message.event, message.payload);
  });

  function captureSession(result) {
    if (result?.ok && result.code && result.playerId && result.resumeToken) {
      session = {
        code: result.code,
        playerId: result.playerId,
        resumeToken: result.resumeToken
      };
    }
  }

  function emitWithAck(eventName, payload, callback) {
    ready
      .then((id) => bridge.onlineEmit(id, eventName, payload))
      .then((result) => {
        captureSession(result);
        callback?.(result);
      })
      .catch((error) => callback?.({ ok: false, error: error?.message || String(error) }));
  }

  return {
    socket,
    connect() {
      if (closed) return;
      ready
        .then((id) => bridge.onlineConnect(id))
        .catch((error) => socket.dispatch("connect_error", { message: error?.message || String(error) }));
    },
    disconnect() {
      socket.setConnected(false);
      ready.then((id) => bridge.onlineDisconnect(id)).catch(() => {});
    },
    close() {
      if (closed) return;
      closed = true;
      socket.setConnected(false);
      stopEvents?.();
      socket.clear();
      ready.then((id) => bridge.onlineDestroyClient(id)).catch(() => {});
    },
    createRoom(payload, callback) { emitWithAck("room:create", payload, callback); },
    joinRoom(payload, callback) { emitWithAck("room:join", payload, callback); },
    startRoom(payload, callback) { emitWithAck("room:start", payload, callback); },
    action(payload, callback) { emitWithAck("game:action", payload, callback); },
    sendChat(text, callback) { emitWithAck("room:chat", { text }, callback); },
    resume(callback) {
      if (!session) return callback?.({ ok: false, error: "Sem sessão para retomar." });
      emitWithAck("room:resume", session, callback);
    },
    getSession() { return session ? { ...session } : null; }
  };
}

function createBrowserOnlineClient(serverUrl) {
  const url = normalizeServerUrl(serverUrl);

  // Transporte da base 2.0.x que o projeto já usava com sucesso no navegador:
  // WebSocket preferencial, com fallback automático para polling.
  const socket = io(url, {
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true
  });

  let session = null;
  let hasConnectedOnce = false;

  socket.on("connect", () => {
    if (hasConnectedOnce && session) socket.emit("room:resume", session);
    hasConnectedOnce = true;
  });

  function captureSession(result) {
    if (result?.ok && result.code && result.playerId && result.resumeToken) {
      session = { code: result.code, playerId: result.playerId, resumeToken: result.resumeToken };
    }
  }

  return {
    socket,
    connect() { if (!socket.connected) socket.connect(); },
    disconnect() { socket.disconnect(); },
    close() { socket.disconnect(); },
    createRoom(payload, callback) {
      socket.emit("room:create", payload, (result) => { captureSession(result); callback?.(result); });
    },
    joinRoom(payload, callback) {
      socket.emit("room:join", payload, (result) => { captureSession(result); callback?.(result); });
    },
    startRoom(payload, callback) { socket.emit("room:start", payload, callback); },
    action(payload, callback) { socket.emit("game:action", payload, callback); },
    sendChat(text, callback) { socket.emit("room:chat", { text }, callback); },
    resume(callback) {
      if (!session) return callback?.({ ok: false, error: "Sem sessão para retomar." });
      socket.emit("room:resume", session, callback);
    },
    getSession() { return session ? { ...session } : null; }
  };
}

export function createOnlineClient(serverUrl) {
  return hasDesktopOnlineBridge()
    ? createDesktopOnlineClient(serverUrl)
    : createBrowserOnlineClient(serverUrl);
}
