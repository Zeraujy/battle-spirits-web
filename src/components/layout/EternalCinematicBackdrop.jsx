import HomeWallpaperSlideshow from "../home/HomeWallpaperSlideshow.jsx";
import "../../styles/pages/eternalInterfaceV350.css";

export default function EternalCinematicBackdrop({ compact = false }) {
  return (
    <div className={`eternal-cinematic-backdrop ${compact ? "compact" : ""}`} aria-hidden="true">
      <HomeWallpaperSlideshow />
      <div className="eternal-cinematic-shadow" />
      <div className="eternal-cinematic-grain" />
    </div>
  );
}
