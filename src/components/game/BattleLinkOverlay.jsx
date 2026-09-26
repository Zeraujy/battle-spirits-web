import { useEffect, useState } from "react";

/**
 * Lightweight SVG link between the attacker and its current battle target.
 *
 * The overlay reads positions from DOM data attributes only. It does not own
 * attack/block rules and therefore cannot disagree with the Rules Engine.
 */
export default function BattleLinkOverlay({
  attackerInstanceId,
  blockerInstanceId = null,
  defenderPlayerId = null,
  theme = "neutral",
  stage = null
}) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    if (!attackerInstanceId) {
      setGeometry(null);
      return undefined;
    }

    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const attacker = document.querySelector(
          `[data-field-card-instance="${attackerInstanceId}"]`
        );

        const target = blockerInstanceId
          ? document.querySelector(`[data-field-card-instance="${blockerInstanceId}"]`)
          : document.querySelector(`[data-life-target="${defenderPlayerId}"]`);

        if (!attacker || !target) {
          setGeometry(null);
          return;
        }

        const a = attacker.getBoundingClientRect();
        const b = target.getBoundingClientRect();

        const x1 = a.left + a.width / 2;
        const y1 = a.top + a.height / 2;
        const x2 = b.left + b.width / 2;
        const y2 = b.top + b.height / 2;
        const bend = Math.max(34, Math.min(105, Math.abs(y2 - y1) * 0.16));
        const direction = x2 >= x1 ? 1 : -1;
        const cx = (x1 + x2) / 2 + bend * direction * 0.12;
        const cy = (y1 + y2) / 2 - bend;

        setGeometry({
          x1,
          y1,
          x2,
          y2,
          path: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
        });
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(update)
      : null;

    const table = document.querySelector(".simulator-page .table-area");
    if (observer && table) observer.observe(table);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
    };
  }, [attackerInstanceId, blockerInstanceId, defenderPlayerId]);

  if (!geometry) return null;

  return (
    <svg className={`battle-link-overlay battle-link-${theme} ${stage ? `battle-stage-${stage}` : ""}`} aria-hidden="true">
      <defs>
        <filter id="battle-link-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="battle-link-head" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,7 L7,3.5 z" className="battle-link-head" />
        </marker>
      </defs>

      <path className="battle-link-shadow" d={geometry.path} />
      <path className="battle-link-core" d={geometry.path} markerEnd="url(#battle-link-head)" />
      <circle className="battle-link-origin" cx={geometry.x1} cy={geometry.y1} r="5" />
    </svg>
  );
}
