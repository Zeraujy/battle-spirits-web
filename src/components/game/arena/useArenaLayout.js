import { useLayoutEffect } from "react";

const WIDTH_COMPACT = 1180;
const WIDTH_WIDE = 1560;
const HEIGHT_COMPACT = 760;

function resolveMode(width, height) {
  if (width < WIDTH_COMPACT || height < HEIGHT_COMPACT) return "compact";
  if (width >= WIDTH_WIDE && height >= 860) return "wide";
  return "standard";
}

/**
 * Presentation-only responsive Arena mode.
 * Updates DOM data attributes directly so viewport changes do not propagate
 * through the gameplay component tree as React state updates.
 */
export default function useArenaLayout(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return undefined;

    let frame = 0;
    let currentMode = "";

    const apply = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const width = Math.max(0, Math.round(rect.width || window.innerWidth || 0));
      const height = Math.max(0, Math.round(rect.height || window.innerHeight || 0));
      const mode = resolveMode(width, height);

      if (mode !== currentMode) {
        currentMode = mode;
        root.dataset.arenaLayoutMode = mode;
      }

      root.style.setProperty("--arena-viewport-width", `${width}px`);
      root.style.setProperty("--arena-viewport-height", `${height}px`);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();

    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(schedule)
      : null;

    observer?.observe(root);
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rootRef]);
}
