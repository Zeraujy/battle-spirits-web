import { useEffect, useRef } from "react";

export default function PointerTiltSurface({
  className = "",
  children,
  maxTilt = 5.5,
  glare = true
}) {
  const ref = useRef(null);
  const frameRef = useRef(null);

  function reset() {
    const element = ref.current;
    if (!element) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    element.classList.remove("is-tilting");
    element.style.setProperty("--eternal-tilt-x", "0deg");
    element.style.setProperty("--eternal-tilt-y", "0deg");
    element.style.setProperty("--eternal-pointer-x", "50%");
    element.style.setProperty("--eternal-pointer-y", "50%");
  }

  function onPointerEnter(event) {
    if (event.pointerType === "touch") return;
    ref.current?.classList.add("is-tilting");
  }

  function onPointerMove(event) {
    const element = ref.current;
    if (!element || event.pointerType === "touch") return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width) / rect.width;
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height) / rect.height;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      element.style.setProperty("--eternal-tilt-x", `${((y * 2 - 1) * -maxTilt).toFixed(2)}deg`);
      element.style.setProperty("--eternal-tilt-y", `${((x * 2 - 1) * maxTilt).toFixed(2)}deg`);
      element.style.setProperty("--eternal-pointer-x", `${(x * 100).toFixed(2)}%`);
      element.style.setProperty("--eternal-pointer-y", `${(y * 100).toFixed(2)}%`);
    });
  }

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div
      ref={ref}
      className={`eternal-pointer-tilt ${className}`.trim()}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
    >
      {children}
      {glare && <span className="eternal-pointer-tilt-glare" aria-hidden="true" />}
    </div>
  );
}
