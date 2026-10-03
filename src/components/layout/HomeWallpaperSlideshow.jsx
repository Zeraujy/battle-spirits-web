import { useEffect, useRef, useState } from "react";
import { getSettings } from "../../services/platform/storage.js";
import "../../styles/theme/homeWallpapers.css";

const WALLPAPERS = Array.from({ length: 10 }, (_, index) =>
  `./images/wallpapers/wallpaper-${String(index + 1).padStart(2, "0")}.webp`
);
const DISPLAY_TIME = 12000;
const WALLPAPER_SESSION_KEY = "battle-spirits-current-wallpaper";

function savedWallpaperIndex() {
  try {
    const value = Number(window.sessionStorage?.getItem(WALLPAPER_SESSION_KEY));
    if (Number.isInteger(value) && value >= 0 && value < WALLPAPERS.length) return value;
  } catch {}
  return Math.floor(Math.random() * WALLPAPERS.length);
}

function rememberWallpaperIndex(index) {
  try { window.sessionStorage?.setItem(WALLPAPER_SESSION_KEY, String(index)); } catch {}
}

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
  const firstIndexRef = useRef(savedWallpaperIndex());
  const queueRef = useRef(shuffledIndexes(WALLPAPERS.length, firstIndexRef.current));
  const currentIndexRef = useRef(firstIndexRef.current);
  const activeLayerRef = useRef("a");
  const timerRef = useRef(null);
  const idleRef = useRef(null);
  const [layerAIndex, setLayerAIndex] = useState(firstIndexRef.current);
  const [layerBIndex, setLayerBIndex] = useState(null);
  const [activeLayer, setActiveLayer] = useState("a");
  const [ready, setReady] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState(() => {
    const settings = getSettings();
    return {
      mode: settings.backgroundMode === "video" ? "video" : "static",
      video: String(settings.backgroundVideo || "background_video_01.mp4")
    };
  });
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const settings = getSettings();
      setBackgroundSettings({
        mode: settings.backgroundMode === "video" ? "video" : "static",
        video: String(settings.backgroundVideo || "background_video_01.mp4")
      });
      setVideoFailed(false);
    };
    window.addEventListener("bs:settings-changed", sync);
    return () => window.removeEventListener("bs:settings-changed", sync);
  }, []);

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
              rememberWallpaperIndex(nextIndex);
              scheduleNext();
            }));
          } else {
            setLayerAIndex(nextIndex);
            requestAnimationFrame(() => requestAnimationFrame(() => {
              activeLayerRef.current = "a";
              setActiveLayer("a");
              currentIndexRef.current = nextIndex;
              rememberWallpaperIndex(nextIndex);
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
      rememberWallpaperIndex(firstIndexRef.current);
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

  const useVideo = backgroundSettings.mode === "video" && !videoFailed;
  const videoSrc = `/video/background/${backgroundSettings.video.replace(/[^a-zA-Z0-9._-]/g, "")}`;

  return (
    <div className={`home-wallpaper-slideshow ${ready || useVideo ? "ready" : ""}`} aria-hidden="true">
      {useVideo ? (
        <video
          className="home-background-video"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <>
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
        </>
      )}
      <div className="home-wallpaper-shade" />
      <div className="home-wallpaper-vignette" />
    </div>
  );
}
