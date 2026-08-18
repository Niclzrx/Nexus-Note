"use client";

import type { CanvasViewport } from "@nexus/types";

export function CanvasBackground({
  viewport,
  enabled,
}: {
  viewport: CanvasViewport;
  enabled: boolean;
}) {
  if (!enabled) {
    return <div className="absolute inset-0 bg-canvas-bg" />;
  }

  const baseSize = 28;
  const size = baseSize * viewport.zoom;
  const offsetX = (-viewport.x * viewport.zoom) % size;
  const offsetY = (-viewport.y * viewport.zoom) % size;
  const dotOpacity = Math.min(0.55, Math.max(0.12, viewport.zoom * 0.4));
  const dotSize = Math.max(1, 1.4 * viewport.zoom);

  return (
    <div
      className="absolute inset-0 bg-canvas-bg"
      style={{
        backgroundImage: `radial-gradient(circle, rgb(var(--color-canvas-dot) / ${dotOpacity}) ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      }}
    />
  );
}
