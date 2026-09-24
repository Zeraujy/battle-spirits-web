const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("battleSpiritsDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: process.versions,
  setFullscreen: (value) => ipcRenderer.invoke("window:set-fullscreen", Boolean(value)),
  setWindowSize: (width, height) => ipcRenderer.invoke("window:set-size", { width, height }),
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  openUpdater: () => ipcRenderer.invoke("updater:open"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadAndInstallUpdate: (manifest) => ipcRenderer.invoke("update:download-install", manifest),
  onUpdateProgress: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("update:progress", handler);
    return () => ipcRenderer.removeListener("update:progress", handler);
  },
  storageRead: (key) => ipcRenderer.sendSync("storage:read-sync", key),
  storageWrite: (key, value) => ipcRenderer.sendSync("storage:write-sync", key, value),
  getServerStatus: () => ipcRenderer.invoke("server:get-status"),
  startServer: () => ipcRenderer.invoke("server:start"),
  stopServer: () => ipcRenderer.invoke("server:stop"),

  // 2.3.11: no executável, Socket.IO roda no processo principal do Electron.
  onlineCreateClient: (serverUrl) => ipcRenderer.invoke("online:create-client", { serverUrl }),
  onlineConnect: (clientId) => ipcRenderer.invoke("online:connect", { clientId }),
  onlineDisconnect: (clientId) => ipcRenderer.invoke("online:disconnect", { clientId }),
  onlineDestroyClient: (clientId) => ipcRenderer.invoke("online:destroy-client", { clientId }),
  onlineEmit: (clientId, eventName, payload) => ipcRenderer.invoke("online:emit", { clientId, eventName, payload }),
  onOnlineEvent: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("online:event", handler);
    return () => ipcRenderer.removeListener("online:event", handler);
  }
});
