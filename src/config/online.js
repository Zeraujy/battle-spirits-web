/*
 * Battle Spirits Simulator
 * Configuração central do servidor online.
 *
 * Se o endereço mudar no futuro, altere SOMENTE
 * ONLINE_SERVER_DEFAULT_URL abaixo.
 *
 * Em builds web também é possível sobrescrever usando:
 * VITE_ONLINE_SERVER_URL=https://novo-servidor.com
 */

const ONLINE_SERVER_DEFAULT_URL =
  "https://desktop-88e9pl9.tail8fb8c7.ts.net";

function normalizeServerUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

export const ONLINE_SERVER_URL =
  normalizeServerUrl(
    import.meta.env?.VITE_ONLINE_SERVER_URL ||
      ONLINE_SERVER_DEFAULT_URL
  );

export const ONLINE_SERVER_DEFAULT =
  ONLINE_SERVER_DEFAULT_URL;