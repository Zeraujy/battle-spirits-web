const { app, BrowserWindow, ipcMain, shell, screen, net } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { Readable } = require("node:stream");
const http = require("node:http");
const { io: createSocketIoClient } = require("socket.io-client");

app.setName("Battle Spirits Eternal Simulator");

let serverInstance = null;
let serverError = null;
let updaterWindow = null;
let rendererServer = null;
let rendererOrigin = null;

function requestedMode() {
  const arg = process.argv.find((item) => item.startsWith("--mode="));
  if (arg) return arg.slice("--mode=".length);
  const exe = path.basename(process.execPath).toLowerCase();
  if (exe.includes("updater")) return "updater";
  if (exe.includes("server")) return "server";
  return "game";
}

const APP_MODE = requestedMode();

function activeWindow() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

function userStoreDir() {
  const dir = path.join(app.getPath("userData"), "player-data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const STORAGE_FILES = {
  decks: "decks.json",
  profile: "profile.json",
  settings: "settings.json"
};

function storagePath(key) {
  const file = STORAGE_FILES[key];
  if (!file) throw new Error("Chave de armazenamento inválida.");
  return path.join(userStoreDir(), file);
}

function readStorage(key) {
  const file = storagePath(key);
  if (!fs.existsSync(file)) return { found: false, value: null };
  try {
    return { found: true, value: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch (error) {
    console.error(`Falha lendo ${file}:`, error);
    return { found: false, value: null };
  }
}

function writeStorage(key, value) {
  const file = storagePath(key);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temp, file);
  return true;
}

function appRoot() {
  return app.getAppPath();
}

function updateConfigPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, "config", "update-config.json");
  return path.join(appRoot(), "config", "update-config.json");
}

function readUpdateConfig() {
  const envUrl = String(process.env.BS_UPDATE_MANIFEST_URL || "").trim();
  if (envUrl) return { manifestUrl: envUrl, channel: "stable" };

  const storedSettings = readStorage("settings");
  const userUrl = String(storedSettings?.value?.updateManifestUrl || "").trim();
  if (userUrl) return { manifestUrl: userUrl, channel: "stable" };

  try {
    return JSON.parse(fs.readFileSync(updateConfigPath(), "utf8"));
  } catch {
    return { manifestUrl: "", channel: "stable" };
  }
}

function compareVersions(a, b) {
  const parse = (value) => String(value || "0").split(".").map((v) => Number.parseInt(v, 10) || 0);
  const av = parse(a);
  const bv = parse(b);
  for (let i = 0; i < Math.max(av.length, bv.length); i += 1) {
    const left = av[i] || 0;
    const right = bv[i] || 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

function resolveInstallerUrl(manifestUrl, installerUrl) {
  return new URL(installerUrl, manifestUrl).toString();
}

async function fetchUpdateManifest() {
  const config = readUpdateConfig();
  if (!config.manifestUrl) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      error: "Servidor de atualizações ainda não configurado.",
      currentVersion: app.getVersion()
    };
  }

  const response = await net.fetch(config.manifestUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Servidor respondeu HTTP ${response.status}.`);
  const manifest = await response.json();
  if (!manifest?.version || !manifest?.installerUrl) throw new Error("Manifesto de atualização inválido.");

  const currentVersion = app.getVersion();
  const available = compareVersions(manifest.version, currentVersion) > 0;
  return {
    ok: true,
    available,
    currentVersion,
    manifest: {
      ...manifest,
      installerUrl: resolveInstallerUrl(config.manifestUrl, manifest.installerUrl)
    }
  };
}

async function downloadAndLaunchUpdate(event, manifest) {
  if (!manifest?.installerUrl) throw new Error("URL do instalador ausente.");

  const response = await net.fetch(manifest.installerUrl, { cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`Falha no download: HTTP ${response.status}.`);

  const downloadsDir = path.join(app.getPath("temp"), "battle-spirits-update");
  fs.mkdirSync(downloadsDir, { recursive: true });
  const target = path.join(downloadsDir, `Battle-Spirits-Setup-${manifest.version}.exe`);
  const temp = `${target}.download`;
  const total = Number(response.headers.get("content-length") || 0);
  let received = 0;
  const hash = crypto.createHash("sha256");
  const out = fs.createWriteStream(temp);

  const source = Readable.fromWeb(response.body);
  source.on("data", (chunk) => {
    received += chunk.length;
    hash.update(chunk);
    event.sender.send("update:progress", {
      received,
      total,
      percent: total ? Math.round((received / total) * 100) : null
    });
  });

  await new Promise((resolve, reject) => {
    source.pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
    source.on("error", reject);
  });

  const digest = hash.digest("hex");
  if (manifest.sha256 && String(manifest.sha256).toLowerCase() !== digest.toLowerCase()) {
    fs.rmSync(temp, { force: true });
    throw new Error("A verificação SHA-256 da atualização falhou.");
  }

  fs.rmSync(target, { force: true });
  fs.renameSync(temp, target);

  // Quando o Updater.exe é aberto separadamente, encerra o jogo/servidor
  // para que o NSIS consiga substituir todos os executáveis.
  const currentExe = path.basename(process.execPath).toLowerCase();
  if (process.platform === "win32" && currentExe.includes("updater")) {
    for (const image of ["Battle Spirits.exe", "Battle Spirits Server.exe"]) {
      await new Promise((resolve) => {
        const killer = spawn("taskkill", ["/IM", image, "/F"], { windowsHide: true, stdio: "ignore" });
        killer.on("close", resolve);
        killer.on("error", resolve);
      });
    }
  }

  const child = spawn(target, [], { detached: true, stdio: "ignore" });
  child.unref();
  setTimeout(() => app.quit(), 250);
  return { ok: true, path: target };
}

function modeQuery(mode) {
  return `mode=${encodeURIComponent(mode)}`;
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
  })[ext] || "application/octet-stream";
}

async function ensureRendererServer() {
  if (rendererOrigin) return rendererOrigin;

  const distRoot = path.resolve(__dirname, "..", "dist");
  const indexFile = path.join(distRoot, "index.html");

  rendererServer = http.createServer((req, res) => {
    try {
      const parsed = new URL(req.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(parsed.pathname || "/");
      if (pathname === "/") pathname = "/index.html";

      let target = path.resolve(distRoot, `.${pathname}`);
      if (!target.startsWith(distRoot + path.sep) && target !== distRoot) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        target = indexFile;
      }

      res.writeHead(200, {
        "content-type": contentTypeFor(target),
        "cache-control": target === indexFile ? "no-store" : "public, max-age=31536000, immutable"
      });
      fs.createReadStream(target).pipe(res);
    } catch (error) {
      console.error("Renderer local server:", error);
      res.writeHead(500);
      res.end("Internal error");
    }
  });

  await new Promise((resolve, reject) => {
    rendererServer.once("error", reject);
    rendererServer.listen(0, "127.0.0.1", () => {
      rendererServer.off("error", reject);
      resolve();
    });
  });

  const address = rendererServer.address();
  rendererOrigin = `http://127.0.0.1:${address.port}`;
  console.log(`[renderer] interface local em ${rendererOrigin}`);
  return rendererOrigin;
}

async function loadMode(win, mode) {
  const devUrl = process.env.ELECTRON_START_URL;
  if (devUrl) {
    return win.loadURL(`${devUrl}${devUrl.includes("?") ? "&" : "?"}${modeQuery(mode)}`);
  }

  // 2.3.10 ONLINE STABLE:
  // volta ao carregamento empacotado usado pela base 2.0.x, que já foi
  // comprovada online no executável. Os modos modernos continuam via query.
  return win.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
    query: { mode }
  });
}

function commonWindowOptions(extra = {}) {
  return {
    backgroundColor: "#090d15",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    ...extra
  };
}

function createGameWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow(commonWindowOptions({
    width: Math.min(1920, workArea.width),
    height: Math.min(1080, workArea.height),
    minWidth: 1180,
    minHeight: 720,
    title: "Battle Spirits"
  }));
  loadMode(win, "game");
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  return win;
}

function createUpdaterWindow() {
  if (updaterWindow && !updaterWindow.isDestroyed()) {
    updaterWindow.focus();
    return updaterWindow;
  }
  updaterWindow = new BrowserWindow(commonWindowOptions({
    width: 640,
    height: 560,
    minWidth: 560,
    minHeight: 460,
    resizable: true,
    title: "Battle Spirits Updater"
  }));
  loadMode(updaterWindow, "updater");
  updaterWindow.on("closed", () => { updaterWindow = null; });
  return updaterWindow;
}

function createServerWindow() {
  const win = new BrowserWindow(commonWindowOptions({
    width: 720,
    height: 620,
    minWidth: 620,
    minHeight: 520,
    title: "Battle Spirits Server"
  }));
  loadMode(win, "server");
  return win;
}

async function serverModulePath() {
  return path.join(appRoot(), "server", "index.mjs");
}

async function startEmbeddedServer() {
  if (serverInstance?.getStats?.().running) return serverInstance.getStats();
  serverError = null;
  try {
    const entry = await serverModulePath();
    const module = await import(pathToFileURL(entry).href);
    serverInstance = await module.createBattleSpiritsServer();
    return serverInstance.getStats();
  } catch (error) {
    serverError = error?.message || String(error);
    console.error("Battle Spirits Server:", error);
    throw error;
  }
}

async function stopEmbeddedServer() {
  if (!serverInstance) return true;
  await serverInstance.stop();
  serverInstance = null;
  return true;
}


// ---------------------------------------------------------------------------
// ONLINE COMPATIBILITY BRIDGE - 2.3.11
// ---------------------------------------------------------------------------
// No navegador, o simulador continua usando socket.io-client diretamente.
// No executável, a conexão fica no processo principal (Node/Electron) e o
// renderer recebe os eventos por IPC. Isso evita diferenças de transporte do
// renderer empacotado sem alterar a engine, a arena ou os eventos do jogo.
const desktopOnlineClients = new Map();
let desktopOnlineSequence = 0;

function normalizeOnlineServerUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/health$/i, "");
}

function sendOnlineEvent(record, eventName, payload = null) {
  if (!record?.sender || record.sender.isDestroyed()) return;
  try {
    record.sender.send("online:event", {
      clientId: record.clientId,
      event: eventName,
      payload
    });
  } catch (error) {
    console.error("[desktop online event]", error);
  }
}

function destroyDesktopOnlineClient(clientId) {
  const record = desktopOnlineClients.get(clientId);
  if (!record) return false;
  try { record.socket.removeAllListeners(); } catch {}
  try { record.socket.disconnect(); } catch {}
  desktopOnlineClients.delete(clientId);
  return true;
}

function createDesktopOnlineClient(sender, rawServerUrl) {
  const serverUrl = normalizeOnlineServerUrl(rawServerUrl);
  if (!/^https?:\/\//i.test(serverUrl)) {
    throw new Error("Servidor inválido. Use http:// ou https://.");
  }

  const clientId = `desktop-online-${Date.now()}-${++desktopOnlineSequence}`;
  const socket = createSocketIoClient(serverUrl, {
    // Mesma preferência da conexão funcional da base 2.0.x.
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  const record = { clientId, socket, sender, serverUrl };
  desktopOnlineClients.set(clientId, record);

  socket.on("connect", () => {
    sendOnlineEvent(record, "connect", {
      socketId: socket.id,
      transport: socket.io?.engine?.transport?.name || "unknown"
    });
  });
  socket.on("disconnect", (reason) => {
    sendOnlineEvent(record, "disconnect", { reason: String(reason || "disconnect") });
  });
  socket.on("connect_error", (error) => {
    sendOnlineEvent(record, "connect_error", { message: error?.message || String(error) });
  });
  socket.on("room:state", (state) => sendOnlineEvent(record, "room:state", state));

  sender.once("destroyed", () => destroyDesktopOnlineClient(clientId));
  return { ok: true, clientId, serverUrl };
}

ipcMain.handle("online:create-client", (event, { serverUrl } = {}) => {
  try { return createDesktopOnlineClient(event.sender, serverUrl); }
  catch (error) { return { ok: false, error: error?.message || String(error) }; }
});

ipcMain.handle("online:connect", (_event, { clientId } = {}) => {
  const record = desktopOnlineClients.get(clientId);
  if (!record) return { ok: false, error: "Cliente online não encontrado." };
  if (!record.socket.connected) record.socket.connect();
  return { ok: true, connected: record.socket.connected };
});

ipcMain.handle("online:disconnect", (_event, { clientId } = {}) => {
  const record = desktopOnlineClients.get(clientId);
  if (!record) return { ok: true };
  record.socket.disconnect();
  return { ok: true };
});

ipcMain.handle("online:destroy-client", (_event, { clientId } = {}) => ({
  ok: destroyDesktopOnlineClient(clientId)
}));

ipcMain.handle("online:emit", async (_event, { clientId, eventName, payload } = {}) => {
  const record = desktopOnlineClients.get(clientId);
  if (!record) return { ok: false, error: "Cliente online não encontrado." };
  const allowed = new Set(["room:create", "room:join", "room:resume", "room:start", "room:chat", "game:action"]);
  if (!allowed.has(eventName)) return { ok: false, error: "Evento online não permitido." };

  return new Promise((resolve) => {
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(value ?? { ok: true });
    };
    const timer = setTimeout(() => finish({ ok: false, error: "Tempo limite de resposta do servidor." }), 20000);
    try {
      record.socket.emit(eventName, payload ?? {}, (result) => finish(result));
    } catch (error) {
      finish({ ok: false, error: error?.message || String(error) });
    }
  });
});

ipcMain.handle("window:set-fullscreen", (_event, value) => {
  const win = activeWindow();
  if (!win) return false;
  win.setFullScreen(Boolean(value));
  return true;
});

ipcMain.handle("window:set-size", (_event, payload = {}) => {
  const win = activeWindow();
  if (!win) return false;
  const display = screen.getDisplayMatching(win.getBounds());
  const maxWidth = Math.max(1180, display?.workAreaSize?.width || 5120);
  const maxHeight = Math.max(720, display?.workAreaSize?.height || 2880);
  const width = Math.max(1180, Math.min(maxWidth, Number(payload.width) || 1920));
  const height = Math.max(720, Math.min(maxHeight, Number(payload.height) || 1080));
  if (win.isFullScreen()) win.setFullScreen(false);
  win.setSize(width, height, true);
  win.center();
  return true;
});

ipcMain.on("storage:read-sync", (event, key) => {
  try { event.returnValue = readStorage(key); }
  catch (error) { event.returnValue = { found: false, value: null, error: error.message }; }
});

ipcMain.on("storage:write-sync", (event, key, value) => {
  try { event.returnValue = { ok: writeStorage(key, value) }; }
  catch (error) { event.returnValue = { ok: false, error: error.message }; }
});

ipcMain.handle("app:get-info", () => ({
  version: app.getVersion(),
  name: app.getName(),
  mode: APP_MODE,
  packaged: app.isPackaged,
  userDataPath: app.getPath("userData")
}));

ipcMain.handle("updater:open", () => {
  createUpdaterWindow();
  return true;
});
ipcMain.handle("update:check", () => fetchUpdateManifest());
ipcMain.handle("update:download-install", (event, manifest) => downloadAndLaunchUpdate(event, manifest));

ipcMain.handle("server:get-status", () => ({
  ...(serverInstance?.getStats?.() || { running: false, port: 3001, cards: 0, rooms: 0, connectedPlayers: 0 }),
  error: serverError
}));
ipcMain.handle("server:start", async () => startEmbeddedServer());
ipcMain.handle("server:stop", async () => {
  await stopEmbeddedServer();
  return { running: false, port: 3001, cards: 0, rooms: 0, connectedPlayers: 0 };
});

app.whenReady().then(async () => {
  if (APP_MODE === "server") {
    try { await startEmbeddedServer(); } catch {}
    createServerWindow();
  } else if (APP_MODE === "updater") {
    createUpdaterWindow();
  } else {
    createGameWindow();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length > 0) return;
    if (APP_MODE === "server") createServerWindow();
    else if (APP_MODE === "updater") createUpdaterWindow();
    else createGameWindow();
  });
});

app.on("before-quit", () => {
  for (const clientId of [...desktopOnlineClients.keys()]) destroyDesktopOnlineClient(clientId);
  if (serverInstance) serverInstance.stop().catch(() => {});
  if (rendererServer) {
    try { rendererServer.close(); } catch {}
    rendererServer = null;
    rendererOrigin = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
