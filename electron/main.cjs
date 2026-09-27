const { app, BrowserWindow, ipcMain, shell, screen, net } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { Readable } = require("node:stream");
const http = require("node:http");
const { io: createSocketIoClient } = require("socket.io-client");

app.setName("Battle Spirits: KAIHOU! Simulator");

const IS_PRODUCTION = app.isPackaged || process.env.NODE_ENV === "production";

let updaterWindow = null;
let rendererServer = null;
let rendererOrigin = null;

function requestedMode() {
  const arg = process.argv.find((item) => item.startsWith("--mode="));
  if (arg) return arg.slice("--mode=".length);
  const exe = path.basename(process.execPath).toLowerCase();
  if (exe.includes("updater")) return "updater";
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

function desktopReleaseConfigPath() {
  return path.join(appRoot(), "config", "desktop-release.json");
}

function readDesktopReleaseConfig() {
  const envRepo = String(process.env.BS_GITHUB_REPOSITORY || "").trim();
  if (envRepo) return { enabled: true, repository: envRepo };
  try {
    return JSON.parse(fs.readFileSync(desktopReleaseConfigPath(), "utf8"));
  } catch {
    return { enabled: false, repository: "" };
  }
}

function desktopAssetName(platform = process.platform, arch = process.arch) {
  if (platform === "win32") return "Battle-Spirits-Windows-Setup.exe";
  if (platform === "darwin") return `Battle-Spirits-macOS-${arch === "arm64" ? "arm64" : "x64"}.zip`;
  if (platform === "linux") return `Battle-Spirits-Linux-${arch === "arm64" ? "arm64" : "x64"}.AppImage`;
  return "";
}

async function fetchGithubReleaseManifest() {
  const config = readDesktopReleaseConfig();
  const repository = String(config?.repository || "").trim();
  if (!config?.enabled || !/^[^/\s]+\/[^/\s]+$/.test(repository)) return null;

  const headers = { Accept: "application/vnd.github+json", "User-Agent": "Battle-Spirits-Desktop" };
  const response = await net.fetch(`https://api.github.com/repos/${repository}/releases/latest`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub Releases respondeu HTTP ${response.status}.`);
  const release = await response.json();
  const version = String(release?.tag_name || "").replace(/^v/i, "");
  const fileName = desktopAssetName();
  const asset = Array.isArray(release?.assets) ? release.assets.find((item) => item?.name === fileName) : null;
  if (!version || !asset?.browser_download_url) throw new Error(`Release desktop sem asset compatível (${fileName || process.platform}).`);

  let sha256 = "";
  const checksumAsset = release.assets?.find((item) => item?.name === "SHA256SUMS.txt");
  if (checksumAsset?.browser_download_url) {
    try {
      const sumsResponse = await net.fetch(checksumAsset.browser_download_url, { headers, cache: "no-store" });
      if (sumsResponse.ok) {
        const sums = await sumsResponse.text();
        const line = sums.split(/\r?\n/).find((entry) => entry.trim().endsWith(` ${fileName}`));
        sha256 = line?.trim().split(/\s+/)[0] || "";
      }
    } catch {}
  }

  return {
    version,
    installerUrl: asset.browser_download_url,
    fileName,
    sha256,
    notes: [`Battle Spirits: KAIHOU! Simulator ${release.tag_name || version}`, "Web e Desktop sincronizados na mesma versão."],
    releaseUrl: release.html_url || `https://github.com/${repository}/releases/latest`
  };
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
  const githubManifest = await fetchGithubReleaseManifest();
  if (githubManifest) {
    const currentVersion = app.getVersion();
    return {
      ok: true,
      available: compareVersions(githubManifest.version, currentVersion) > 0,
      currentVersion,
      manifest: githubManifest,
      source: "github"
    };
  }

  // Compatibilidade com instalações desktop antigas que ainda usam manifest URL.
  const config = readUpdateConfig();
  if (!config.manifestUrl) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      error: "Fonte de atualizações ainda não configurada.",
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
    },
    source: "legacy"
  };
}

async function downloadAndLaunchUpdate(event, manifest) {
  if (!manifest?.installerUrl) throw new Error("URL do instalador ausente.");

  const response = await net.fetch(manifest.installerUrl, { cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`Falha no download: HTTP ${response.status}.`);

  const downloadsDir = path.join(app.getPath("temp"), "battle-spirits-update");
  fs.mkdirSync(downloadsDir, { recursive: true });
  const safeFileName = String(manifest.fileName || desktopAssetName() || `Battle-Spirits-${manifest.version}.bin`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const target = path.join(downloadsDir, safeFileName);
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

  if (process.platform === "win32") {
    // The updater is part of the main game executable. No separate Server.exe or
    // Updater.exe is shipped. NSIS receives /S so upgrades run unattended.
    const child = spawn(target, ["/S"], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    setTimeout(() => app.quit(), 400);
    return { ok: true, path: target, action: "silent-installer" };
  }

  if (process.platform === "darwin") {
    const extractDir = path.join(downloadsDir, `mac-${manifest.version}-${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });
    await new Promise((resolve, reject) => {
      const unzip = spawn("ditto", ["-x", "-k", target, extractDir], { stdio: "ignore" });
      unzip.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Falha ao extrair atualização macOS (${code}).`)));
      unzip.on("error", reject);
    });
    const appEntry = fs.readdirSync(extractDir, { withFileTypes: true }).find((entry) => entry.isDirectory() && entry.name.endsWith(".app"));
    if (!appEntry) throw new Error("O pacote macOS não contém o aplicativo esperado.");

    const currentBundle = path.resolve(path.dirname(process.execPath), "../..");
    const stagedBundle = `${currentBundle}.new`;
    const backupBundle = `${currentBundle}.old`;
    fs.rmSync(stagedBundle, { recursive: true, force: true });
    await new Promise((resolve, reject) => {
      const copy = spawn("ditto", [path.join(extractDir, appEntry.name), stagedBundle], { stdio: "ignore" });
      copy.on("close", (code) => code === 0 ? resolve() : reject(new Error("Sem permissão para preparar a atualização em Applications.")));
      copy.on("error", reject);
    });

    const script = path.join(downloadsDir, `install-macos-${manifest.version}.sh`);
    const q = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
    fs.writeFileSync(script, `#!/bin/sh\nPID=${process.pid}\nwhile kill -0 "$PID" 2>/dev/null; do sleep 1; done\nrm -rf ${q(backupBundle)}\nmv ${q(currentBundle)} ${q(backupBundle)} || exit 1\nif mv ${q(stagedBundle)} ${q(currentBundle)}; then\n  open ${q(currentBundle)}\n  rm -rf ${q(backupBundle)}\nelse\n  mv ${q(backupBundle)} ${q(currentBundle)}\n  exit 1\nfi\nrm -f "$0"\n`, "utf8");
    fs.chmodSync(script, 0o755);
    const child = spawn("/bin/sh", [script], { detached: true, stdio: "ignore" });
    child.unref();
    setTimeout(() => app.quit(), 250);
    return { ok: true, path: stagedBundle, action: "mac-replace" };
  }

  if (process.platform === "linux") {
    const currentAppImage = String(process.env.APPIMAGE || "").trim();
    if (currentAppImage && target.toLowerCase().endsWith(".appimage")) {
      try {
        const next = `${currentAppImage}.new`;
        const backup = `${currentAppImage}.old`;
        fs.copyFileSync(target, next);
        fs.chmodSync(next, 0o755);
        fs.rmSync(backup, { force: true });
        fs.renameSync(currentAppImage, backup);
        fs.renameSync(next, currentAppImage);
        const child = spawn(currentAppImage, [], { detached: true, stdio: "ignore" });
        child.unref();
        setTimeout(() => app.quit(), 250);
        return { ok: true, path: currentAppImage, action: "appimage-replaced" };
      } catch (error) {
        console.warn("Falha no replace automático do AppImage:", error);
      }
    }
    try { fs.chmodSync(target, 0o755); } catch {}
    const child = spawn(target, [], { detached: true, stdio: "ignore" });
    child.unref();
    setTimeout(() => app.quit(), 250);
    return { ok: true, path: target, action: "appimage" };
  }

  throw new Error("Atualização automática não suportada nesta plataforma.");
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
    ".woff2": "font/woff2",
    ".mp4": "video/mp4"
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
      sandbox: true,
      devTools: !IS_PRODUCTION,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false
    },
    ...extra
  };
}

function hardenProductionWindow(win) {
  if (!win || win.isDestroyed()) return;

  // Packaged releases never expose Chromium developer tooling. This is a UX
  // hardening layer only; authoritative security remains server-side.
  if (IS_PRODUCTION) {
    win.removeMenu();
    win.webContents.on("before-input-event", (event, input) => {
      const key = String(input?.key || "").toLowerCase();
      const devShortcut =
        key === "f12" ||
        ((input.control || input.meta) && input.shift && ["i", "j", "c", "k"].includes(key)) ||
        (input.meta && input.alt && ["i", "j", "c"].includes(key));
      if (devShortcut) event.preventDefault();
    });
    win.webContents.on("devtools-opened", () => {
      try { win.webContents.closeDevTools(); } catch {}
    });
  }

  win.webContents.on("context-menu", (event) => event.preventDefault());
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
  win.webContents.on("will-navigate", (event, url) => {
    try {
      const target = new URL(url);
      const current = new URL(win.webContents.getURL());
      if (target.origin !== current.origin) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  });
}

function createGameWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow(commonWindowOptions({
    width: Math.min(1920, workArea.width),
    height: Math.min(1080, workArea.height),
    minWidth: 1180,
    minHeight: 720,
    title: "Battle Spirits: KAIHOU! Simulator"
  }));
  hardenProductionWindow(win);
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
    title: "Battle Spirits: KAIHOU! Updater"
  }));
  hardenProductionWindow(updaterWindow);
  loadMode(updaterWindow, "updater");
  updaterWindow.on("closed", () => { updaterWindow = null; });
  return updaterWindow;
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
  for (const eventName of [
    "room:state",
    "matchmaking:status",
    "matchmaking:host",
    "matchmaking:guest",
    "matchmaking:room",
    "matchmaking:start",
    "matchmaking:failed"
  ]) {
    socket.on(eventName, (payload) => sendOnlineEvent(record, eventName, payload));
  }

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
  const allowed = new Set([
    "room:create",
    "room:join",
    "room:resume",
    "room:start",
    "room:chat",
    "game:action",
    "matchmaking:join",
    "matchmaking:cancel",
    "matchmaking:abort",
    "matchmaking:roomReady",
    "matchmaking:joined"
  ]);
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
  packaged: app.isPackaged
}));

ipcMain.handle("updater:open", () => {
  createUpdaterWindow();
  return true;
});
ipcMain.handle("update:check", () => fetchUpdateManifest());
ipcMain.handle("update:download-install", (event, manifest) => downloadAndLaunchUpdate(event, manifest));

async function checkForUpdateOnLaunch() {
  if (!app.isPackaged || APP_MODE !== "game") return;
  try {
    const result = await fetchUpdateManifest();
    if (result?.ok && result.available) createUpdaterWindow();
  } catch (error) {
    console.warn("[updater] verificação automática falhou:", error?.message || error);
  }
}

app.whenReady().then(async () => {
  if (APP_MODE === "updater") createUpdaterWindow();
  else {
    createGameWindow();
    setTimeout(() => { checkForUpdateOnLaunch(); }, 4500);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length > 0) return;
    if (APP_MODE === "updater") createUpdaterWindow();
    else createGameWindow();
  });
});

app.on("before-quit", () => {
  for (const clientId of [...desktopOnlineClients.keys()]) destroyDesktopOnlineClient(clientId);
  if (rendererServer) {
    try { rendererServer.close(); } catch {}
    rendererServer = null;
    rendererOrigin = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
