import { useEffect, useRef, useState } from "react";
import "../../styles/theme/homeWallpapers.css";

const WALLPAPERS = Array.from({ length: 10 }, (_, index) =>
  `./images/wallpapers/wallpaper-${String(index + 1).padStart(2, "0")}.webp`
);
const DISPLAY_TIME = 12000;

function shuffledIndexes(length, excludedIndex = null) {
  const indexes = Array.from({ length }, (_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
  }
  if (excludedIndex != null && indexes.length > 1 && indexes[0] === excludedIndex) {
    const swapIndex = indexes.findIndex((value) => value !== excludedIndex);
    if (swapIndex > 0) [indexes[0], indexes[swapIndex]] = [indexes[swapIndex], indexes[0]];
  }
  return indexes;
}

function preloadAndDecode(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = async () => {
      try { await image.decode?.(); } catch {}
      resolve(src);
    };
    image.onerror = () => resolve(src);
    image.src = src;
  });
}

export default function HomeWallpaperSlideshow() {
  const firstIndexRef = useRef(Math.floor(Math.random() * WALLPAPERS.length));
  const queueRef = useRef(shuffledIndexes(WALLPAPERS.length, firstIndexRef.current));
  const currentIndexRef = useRef(firstIndexRef.current);
  const activeLayerRef = useRef("a");
  const timerRef = useRef(null);
  const idleRef = useRef(null);
  const [layerAIndex, setLayerAIndex] = useState(firstIndexRef.current);
  const [layerBIndex, setLayerBIndex] = useState(null);
  const [activeLayer, setActiveLayer] = useState("a");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const takeNextIndex = () => {
      if (!queueRef.current.length) queueRef.current = shuffledIndexes(WALLPAPERS.length, currentIndexRef.current);
      let next = queueRef.current.shift();
      if (next === currentIndexRef.current && WALLPAPERS.length > 1) {
        if (!queueRef.current.length) queueRef.current = shuffledIndexes(WALLPAPERS.length, currentIndexRef.current);
        next = queueRef.current.shift();
      }
      return next;
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const nextIndex = takeNextIndex();
      const prepare = async () => {
        await preloadAndDecode(WALLPAPERS[nextIndex]);
        if (cancelled) return;
        timerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          if (activeLayerRef.current === "a") {
            setLayerBIndex(nextIndex);
            requestAnimationFrame(() => requestAnimationFrame(() => {
              activeLayerRef.current = "b";
              setActiveLayer("b");
              currentIndexRef.current = nextIndex;
              scheduleNext();
            }));
          } else {
            setLayerAIndex(nextIndex);
            requestAnimationFrame(() => requestAnimationFrame(() => {
              activeLayerRef.current = "a";
              setActiveLayer("a");
              currentIndexRef.current = nextIndex;
              scheduleNext();
            }));
          }
        }, DISPLAY_TIME);
      };

      if (typeof window.requestIdleCallback === "function") {
        idleRef.current = window.requestIdleCallback(prepare, { timeout: 2500 });
      } else {
        idleRef.current = window.setTimeout(prepare, 900);
      }
    };

    (async () => {
      await preloadAndDecode(WALLPAPERS[firstIndexRef.current]);
      if (cancelled) return;
      setReady(true);
      scheduleNext();
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (idleRef.current) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleRef.current);
        else window.clearTimeout(idleRef.current);
      }
    };
  }, []);

  return (
    <div className={`home-wallpaper-slideshow ${ready ? "ready" : ""}`} aria-hidden="true">
      <img
        className={`home-wallpaper-layer ${activeLayer === "a" ? "active" : ""}`}
        src={WALLPAPERS[layerAIndex]}
        alt=""
        draggable="false"
        decoding="async"
        loading="eager"
        fetchPriority="high"
      />
      {layerBIndex != null && (
        <img
          className={`home-wallpaper-layer ${activeLayer === "b" ? "active" : ""}`}
          src={WALLPAPERS[layerBIndex]}
          alt=""
          draggable="false"
          decoding="async"
          loading="eager"
          fetchPriority="low"
        />
      )}
      <div className="home-wallpaper-shade" />
      <div className="home-wallpaper-vignette" />
    </div>
  );
}
