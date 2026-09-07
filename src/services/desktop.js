export async function applyDisplaySettings({ resolution = "1920x1080", displayMode = "windowed" } = {}) {
  const [width, height] = String(resolution).split("x").map(Number);
  const desktop = window.battleSpiritsDesktop;
  if (desktop?.setFullscreen) {
    await desktop.setFullscreen(displayMode === "fullscreen");
    if (displayMode !== "fullscreen" && Number.isFinite(width) && Number.isFinite(height)) await desktop.setWindowSize(width, height);
    return;
  }
  if (displayMode === "fullscreen" && document.documentElement.requestFullscreen) {
    await document.documentElement.requestFullscreen().catch(() => {});
  } else if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen().catch(() => {});
  }
}

export async function getAppInfo() {
  const desktop = window.battleSpiritsDesktop;
  if (desktop?.getAppInfo) return desktop.getAppInfo();
  return { version: "2.2.0", name: "Battle Spirits", mode: "web", packaged: false, userDataPath: null };
}

export async function openUpdater() {
  const desktop = window.battleSpiritsDesktop;
  if (desktop?.openUpdater) return desktop.openUpdater();
  return false;
}
