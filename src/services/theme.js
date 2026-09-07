const DEFAULT_THEME = {
  bg: "#07101e",
  panel: "#0d1a2e",
  panel2: "#12243e",
  text: "#f5f7ff",
  muted: "#9aa8bc",
  accent: "#f4bd4b",
  accent2: "#68a8ff",
  danger: "#ff6a73",
  ok: "#79dda8"
};

export function normalizeTheme(theme = {}) {
  return { ...DEFAULT_THEME, ...(theme || {}) };
}

export function applyTheme(theme = {}) {
  if (typeof document === "undefined") return;
  const next = normalizeTheme(theme);
  const root = document.documentElement;
  root.style.setProperty("--bg", next.bg);
  root.style.setProperty("--panel-solid", next.panel);
  root.style.setProperty("--panel-2-solid", next.panel2);
  root.style.setProperty("--text", next.text);
  root.style.setProperty("--muted", next.muted);
  root.style.setProperty("--accent", next.accent);
  root.style.setProperty("--accent-2", next.accent2);
  root.style.setProperty("--danger", next.danger);
  root.style.setProperty("--ok", next.ok);
  root.style.setProperty("--panel", `${next.panel}eb`);
  root.style.setProperty("--panel-2", `${next.panel2}db`);
}

export { DEFAULT_THEME };
