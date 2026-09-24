/*
 * Battle Spirits Eternal Simulator v3
 * Leitura central da configuração de rede.
 *
 * Ordem de prioridade:
 * 1. VITE_ONLINE_SERVER_URL (build/deploy)
 * 2. public/config/online-config.js (runtime, recomendado)
 * 3. fallback abaixo
 */

const FALLBACK = {
  serverUrl: "http://127.0.0.1:3001",
  healthPath: "/health",
  connectionTimeoutMs: 10000,
  transports: ["websocket", "polling"]
};

function runtimeConfig() {
  if (typeof window === "undefined") return {};
  return window.BATTLE_SPIRITS_ONLINE_CONFIG || {};
}

function normalizeServerUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/health$/i, "");
}

const raw = runtimeConfig();
const envUrl = import.meta.env?.VITE_ONLINE_SERVER_URL;

export const ONLINE_CONFIG = Object.freeze({
  ...FALLBACK,
  ...raw,
  serverUrl: normalizeServerUrl(envUrl || raw.serverUrl || FALLBACK.serverUrl),
  transports: Array.isArray(raw.transports) && raw.transports.length
    ? raw.transports
    : FALLBACK.transports
});

export const ONLINE_SERVER_URL = ONLINE_CONFIG.serverUrl;
export const ONLINE_SERVER_DEFAULT = FALLBACK.serverUrl;

export function getOnlineHealthUrl() {
  return `${ONLINE_CONFIG.serverUrl}${ONLINE_CONFIG.healthPath || "/health"}`;
}
