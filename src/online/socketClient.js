import { io } from "socket.io-client";

export function createOnlineClient(serverUrl) {
  const socket = io(serverUrl, { transports: ["websocket", "polling"], autoConnect: false, reconnection: true });
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
    createRoom(payload, callback) {
      socket.emit("room:create", payload, (result) => { captureSession(result); callback?.(result); });
    },
    joinRoom(payload, callback) {
      socket.emit("room:join", payload, (result) => { captureSession(result); callback?.(result); });
    },
    startRoom(payload, callback) { socket.emit("room:start", payload, callback); },
    action(payload, callback) { socket.emit("game:action", payload, callback); },
    resume(callback) {
      if (!session) return callback?.({ ok: false, error: "Sem sessão para retomar." });
      socket.emit("room:resume", session, callback);
    },
    getSession() { return session ? { ...session } : null; }
  };
}
