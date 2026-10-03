import { useLayoutEffect, useMemo, useRef, useState } from "react";

const MOTION_DURATION = 260;

function collectCards(players = {}) {
  const cards = [];

  for (const [playerId, player] of Object.entries(players || {})) {
    const pushCards = (items, zoneKey) => {
      for (const card of items || []) {
        if (!card?.instanceId) continue;
        cards.push({ instanceId: card.instanceId, zoneKey, playerId });
      }
    };

    pushCards(player?.deck, `deck:${playerId}`);
    pushCards(player?.hand, `hand:${playerId}`);
    pushCards(player?.trash, `trash:${playerId}`);

    if (player?.burst?.instanceId) pushCards([player.burst], `burst:${playerId}`);

    for (const zone of ["other", "spirits", "nexuses"]) {
      pushCards(player?.field?.[zone], `field:${playerId}:${zone}`);
    }
  }

  return cards;
}

function rectOf(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function findCardElement(instanceId) {
  if (typeof document === "undefined") return null;
  return document.querySelector(`[data-motion-card-instance="${CSS.escape(String(instanceId))}"]`);
}

function findZoneElement(zoneKey) {
  if (typeof document === "undefined") return null;
  return document.querySelector(`[data-motion-zone="${CSS.escape(String(zoneKey))}"]`);
}

function imageFrom(element) {
  return element?.querySelector?.("img")?.currentSrc || element?.querySelector?.("img")?.src || "";
}

export default function CardMotionLayer({ players, enabled = true }) {
  const cards = useMemo(() => collectCards(players), [players]);
  const motionSignature = useMemo(
    () => cards.map((card) => `${card.instanceId}@${card.zoneKey}`).sort().join("|"),
    [cards]
  );
  const previousRef = useRef(new Map());
  const timersRef = useRef(new Set());
  const [motions, setMotions] = useState([]);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") return undefined;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      previousRef.current = new Map(cards.map((card) => [card.instanceId, { ...card }]));
      return undefined;
    }

    const previous = previousRef.current;
    const next = new Map();
    const created = [];

    for (const card of cards) {
      const old = previous.get(card.instanceId);
      const cardElement = findCardElement(card.instanceId);
      const zoneElement = findZoneElement(card.zoneKey);
      const targetRect = rectOf(cardElement) || rectOf(zoneElement);
      const targetImage = imageFrom(cardElement) || imageFrom(zoneElement);

      if (old && old.zoneKey !== card.zoneKey && old.rect && targetRect) {
        created.push({
          id: `${card.instanceId}:${performance.now()}:${card.zoneKey}`,
          instanceId: card.instanceId,
          from: old.rect,
          to: targetRect,
          image: targetImage || old.image || ""
        });
      }

      next.set(card.instanceId, { ...card, rect: targetRect, image: targetImage });
    }

    previousRef.current = next;

    if (created.length) {
      setMotions((current) => [...current, ...created]);
      for (const motion of created) {
        const timer = window.setTimeout(() => {
          setMotions((current) => current.filter((item) => item.id !== motion.id));
          timersRef.current.delete(timer);
        }, MOTION_DURATION + 80);
        timersRef.current.add(timer);
      }
    }

    return undefined;
    // motionSignature intentionally gates DOM measurement to actual card-zone changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionSignature, enabled]);

  useLayoutEffect(() => () => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current.clear();
  }, []);

  if (!motions.length) return null;

  return (
    <div className="card-motion-layer" aria-hidden="true">
      {motions.map((motion) => {
        const dx = motion.to.left - motion.from.left;
        const dy = motion.to.top - motion.from.top;
        const scaleX = motion.from.width ? motion.to.width / motion.from.width : 1;
        const scaleY = motion.from.height ? motion.to.height / motion.from.height : 1;

        return (
          <div
            key={motion.id}
            className="card-motion-ghost"
            style={{
              "--motion-left": `${motion.from.left}px`,
              "--motion-top": `${motion.from.top}px`,
              "--motion-width": `${motion.from.width}px`,
              "--motion-height": `${motion.from.height}px`,
              "--motion-x": `${dx}px`,
              "--motion-y": `${dy}px`,
              "--motion-scale-x": scaleX,
              "--motion-scale-y": scaleY,
              "--motion-duration": `${MOTION_DURATION}ms`
            }}
          >
            {motion.image ? <img src={motion.image} alt="" /> : <span />}
          </div>
        );
      })}
    </div>
  );
}
