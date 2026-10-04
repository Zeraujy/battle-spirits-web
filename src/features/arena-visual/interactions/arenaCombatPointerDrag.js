import { declareAttackIntent, declareBlockIntent } from "./arenaIntentFactory.js";

const MOVE_THRESHOLD = 7;
const COLOR_MAP = Object.freeze({
  red: "#ef5350",
  purple: "#ab6ee8",
  green: "#5fbd68",
  white: "#e9edf2",
  yellow: "#e6c84f",
  blue: "#4da4e8"
});

function distance(a, b) {
  return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y));
}

function cardColor(card) {
  const raw = String(card?.color || card?.colors?.[0] || "white").toLowerCase();
  return COLOR_MAP[raw] || COLOR_MAP.white;
}

function createArrow(color) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const defs = document.createElementNS(ns, "defs");
  const marker = document.createElementNS(ns, "marker");
  const head = document.createElementNS(ns, "path");
  const glow = document.createElementNS(ns, "filter");
  const blur = document.createElementNS(ns, "feGaussianBlur");
  const path = document.createElementNS(ns, "path");
  const shadow = document.createElementNS(ns, "path");

  const markerId = `arena-visual-combat-head-${Math.random().toString(36).slice(2)}`;
  const glowId = `arena-visual-combat-glow-${Math.random().toString(36).slice(2)}`;

  svg.classList.add("arena-visual-combat-drag-arrow");
  marker.setAttribute("id", markerId);
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  head.setAttribute("d", "M0,0 L0,10 L10,5 z");
  head.setAttribute("fill", color);
  marker.appendChild(head);

  glow.setAttribute("id", glowId);
  glow.setAttribute("x", "-60%");
  glow.setAttribute("y", "-60%");
  glow.setAttribute("width", "220%");
  glow.setAttribute("height", "220%");
  blur.setAttribute("stdDeviation", "4");
  glow.appendChild(blur);

  defs.appendChild(marker);
  defs.appendChild(glow);
  svg.appendChild(defs);

  shadow.classList.add("arena-visual-combat-drag-shadow");
  shadow.setAttribute("fill", "none");
  shadow.setAttribute("stroke", color);
  shadow.setAttribute("stroke-width", "9");
  shadow.setAttribute("stroke-linecap", "round");
  shadow.setAttribute("opacity", ".18");
  shadow.setAttribute("filter", `url(#${glowId})`);

  path.classList.add("arena-visual-combat-drag-core");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "3.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("marker-end", `url(#${markerId})`);

  svg.appendChild(shadow);
  svg.appendChild(path);
  document.body.appendChild(svg);
  return { svg, path, shadow };
}

function updateArrow(parts, start, end) {
  if (!parts) return;
  const bend = Math.max(28, Math.min(110, Math.abs(end.y - start.y) * 0.18 + Math.abs(end.x - start.x) * 0.05));
  const cx = (start.x + end.x) / 2;
  const cy = (start.y + end.y) / 2 - bend;
  const d = `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
  parts.path.setAttribute("d", d);
  parts.shadow.setAttribute("d", d);
}

export function startArenaCombatPointerDrag({ event, card, interaction }) {
  if (!event || !card || event.button > 0 || !interaction?.requestIntent) return () => {};
  if (event.target?.closest?.(".arena-visual-core-token, .arena-visual-card-core-overlay")) return () => {};

  const canAttack = Boolean(card.canAttack);
  const canBlock = Boolean(card.canBlock && interaction?.battleAttackerInstanceId);
  if (!canAttack && !canBlock) return () => {};

  const pointerId = event.pointerId;
  const rect = event.currentTarget.getBoundingClientRect();
  const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const startPointer = { x: event.clientX, y: event.clientY };
  let moved = false;
  let parts = null;
  let frame = 0;
  let lastPoint = { ...startPointer };

  const move = (moveEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    lastPoint = { x: moveEvent.clientX, y: moveEvent.clientY };
    if (!moved && distance(startPointer, lastPoint) >= MOVE_THRESHOLD) {
      moved = true;
      parts = createArrow(cardColor(card));
      document.documentElement.classList.add("arena-visual-combat-dragging");
    }
    if (!moved) return;
    moveEvent.preventDefault();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => updateArrow(parts, origin, lastPoint));
  };

  const cleanup = () => {
    cancelAnimationFrame(frame);
    parts?.svg?.remove();
    document.documentElement.classList.remove("arena-visual-combat-dragging");
    window.removeEventListener("pointermove", move, { passive: false });
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
  };

  const up = (upEvent) => {
    if (upEvent.pointerId !== pointerId) return;
    if (moved) {
      const element = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      if (canAttack) {
        const lifeTarget = element?.closest?.(`[data-life-target="${interaction.opponentPlayerId}"]`);
        if (lifeTarget) interaction.requestIntent(declareAttackIntent(card.instanceId, { input: upEvent.pointerType || "pointer" }));
      } else if (canBlock) {
        const attacker = element?.closest?.(`[data-field-card-instance="${interaction.battleAttackerInstanceId}"]`);
        if (attacker) interaction.requestIntent(declareBlockIntent(card.instanceId, { input: upEvent.pointerType || "pointer" }));
      }
    }
    cleanup();
  };

  const cancel = (cancelEvent) => {
    if (cancelEvent.pointerId !== pointerId) return;
    cleanup();
  };

  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  try { event.currentTarget?.setPointerCapture?.(pointerId); } catch {}

  return cleanup;
}
