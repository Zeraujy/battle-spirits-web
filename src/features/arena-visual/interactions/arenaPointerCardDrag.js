const MOVE_THRESHOLD = 6;
const HOLD_DELAY_MS = 110;

function distance(a, b) {
  return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y));
}

function createGhost(imageSrc) {
  const ghost = document.createElement("div");
  ghost.className = "arena-visual-card-drag-ghost";
  const image = document.createElement("img");
  image.src = imageSrc || "/images/card-back.webp";
  image.alt = "";
  ghost.appendChild(image);
  document.body.appendChild(ghost);
  return ghost;
}

export function startArenaPointerCardDrag({ event, payload, imageSrc, onDrop, onDragStateChange }) {
  if (!event || !payload || event.button > 0) return () => {};

  const pointerId = event.pointerId;
  const origin = { x: event.clientX, y: event.clientY };
  let lastPoint = { ...origin };
  let dragging = false;
  let disposed = false;
  let ghost = null;
  let frame = 0;

  const paintGhost = () => {
    frame = 0;
    if (!ghost) return;
    ghost.style.transform = `translate3d(${lastPoint.x}px, ${lastPoint.y}px, 0) translate(-50%, -58%) rotate(-1.5deg) scale(1.035)`;
  };

  const scheduleGhost = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(paintGhost);
  };

  const activate = () => {
    if (disposed || dragging) return;
    dragging = true;
    document.documentElement.classList.add("arena-visual-pointer-card-dragging");
    ghost = createGhost(imageSrc);
    scheduleGhost();
    onDragStateChange?.(true);
  };

  const timer = window.setTimeout(activate, HOLD_DELAY_MS);

  const onMove = (moveEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    lastPoint = { x: moveEvent.clientX, y: moveEvent.clientY };
    if (!dragging && distance(origin, lastPoint) >= MOVE_THRESHOLD) activate();
    if (!dragging) return;
    moveEvent.preventDefault();
    scheduleGhost();
  };

  const finish = (upEvent, cancelled = false) => {
    if (upEvent.pointerId !== pointerId) return;
    window.clearTimeout(timer);
    window.removeEventListener("pointermove", onMove, { passive: false });
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    if (frame) window.cancelAnimationFrame(frame);

    if (dragging && !cancelled) {
      const target = document
        .elementFromPoint(upEvent.clientX, upEvent.clientY)
        ?.closest?.('[data-zone="battlefield"].is-player');
      if (target) onDrop?.(payload, target, { x: upEvent.clientX, y: upEvent.clientY });
    }

    ghost?.remove();
    ghost = null;
    if (dragging) {
      document.documentElement.classList.remove("arena-visual-pointer-card-dragging");
      onDragStateChange?.(false);
    }
    disposed = true;
  };

  const onUp = (upEvent) => finish(upEvent, false);
  const onCancel = (cancelEvent) => finish(cancelEvent, true);

  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);

  try { event.currentTarget?.setPointerCapture?.(pointerId); } catch {}

  return () => {
    if (disposed) return;
    window.clearTimeout(timer);
    window.removeEventListener("pointermove", onMove, { passive: false });
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    if (frame) window.cancelAnimationFrame(frame);
    ghost?.remove();
    document.documentElement.classList.remove("arena-visual-pointer-card-dragging");
    disposed = true;
  };
}
