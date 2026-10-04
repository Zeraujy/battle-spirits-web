import { useEffect, useState } from "react";
import { resolveArenaVisualResponsiveProfile } from "../models/arenaVisualResponsiveProfiles.js";

function readViewportWidth() {
  if (typeof window === "undefined") return 1650;
  return window.innerWidth || document.documentElement?.clientWidth || 1650;
}

export default function useArenaVisualResponsiveProfile() {
  const [profile, setProfile] = useState(() => resolveArenaVisualResponsiveProfile(readViewportWidth()));

  useEffect(() => {
    const update = () => setProfile(resolveArenaVisualResponsiveProfile(readViewportWidth()));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return profile;
}
