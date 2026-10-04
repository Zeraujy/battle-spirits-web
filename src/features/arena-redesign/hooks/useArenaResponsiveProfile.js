import { useEffect, useState } from "react";
import {
  getArenaInputProfile,
  getArenaViewportProfile
} from "../models/responsiveArenaPresentation.js";

function readProfile() {
  if (typeof window === "undefined") {
    return { viewport: "desktop", input: "pointer" };
  }

  const coarsePointer = Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
  const hoverCapable = Boolean(window.matchMedia?.("(hover: hover)")?.matches);

  return {
    viewport: getArenaViewportProfile({
      width: window.innerWidth,
      height: window.innerHeight
    }),
    input: getArenaInputProfile({ coarsePointer, hoverCapable })
  };
}

export default function useArenaResponsiveProfile() {
  const [profile, setProfile] = useState(readProfile);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const update = () => setProfile(readProfile());
    const coarse = window.matchMedia?.("(pointer: coarse)");
    const hover = window.matchMedia?.("(hover: hover)");

    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });
    coarse?.addEventListener?.("change", update);
    hover?.addEventListener?.("change", update);

    update();
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      coarse?.removeEventListener?.("change", update);
      hover?.removeEventListener?.("change", update);
    };
  }, []);

  return profile;
}
