"use client";

import { useMemo } from "react";
import type { AnyElement, CanvasViewport } from "@nexus/types";
import { Panel } from "@nexus/design-system";

interface MinimapProps {
  elements: AnyElement[];
  viewport: CanvasViewport;
  viewportSize: { width: number; height: number };
  onNavigate: (worldX: number, worldY: number) => void;
}

const MAP_W = 176;
const MAP_H = 120;
const PADDING = 400;

export function Minimap({ elements, viewport, viewportSize, onNavigate }: MinimapProps) {
  const bounds = useMemo(() => {
    if (elements.length === 0) {
      return { minX: -PADDING, minY: -PADDING, maxX: PADDING, maxY: PADDING };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of elements) {
      minX = Math.min(minX, el.position.x);
      minY = Math.min(minY, el.position.y);
      maxX = Math.max(maxX, el.position.x + el.size.width);
      maxY = Math.max(maxY, el.position.y + el.size.height);
    }
    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      maxX: maxX + PADDING,
      maxY: maxY + PADDING,
    };
  }, [elements]);

  const worldW = Math.max(1, bounds.maxX - bounds.minX);
  const worldH = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(MAP_W / worldW, MAP_H / worldH);

  const toMap = (x: number, y: number) => ({
    x: (x - bounds.minX) * scale,
    y: (y - bounds.minY) * scale,
  });

  const viewWorldW = viewportSize.width / viewport.zoom;
  const viewWorldH = viewportSize.height / viewport.zoom;
  const viewTopLeft = toMap(viewport.x, viewport.y);

  return (
    <Panel
      elevated
      className="pointer-events-auto absolute bottom-5 right-4 z-panel overflow-hidden p-1.5"
      style={{ width: MAP_W + 12, height: MAP_H + 12 }}
    >
      <div
        className="relative cursor-crosshair overflow-hidden rounded-md bg-canvas-bg"
        style={{ width: MAP_W, height: MAP_H }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mapX = e.clientX - rect.left;
          const mapY = e.clientY - rect.top;
          const worldX = bounds.minX + mapX / scale;
          const worldY = bounds.minY + mapY / scale;
          onNavigate(worldX, worldY);
        }}
      >
        {elements.map((el) => {
          const p = toMap(el.position.x, el.position.y);
          return (
            <div
              key={el.id}
              className="absolute rounded-[1px] bg-text-faint"
              style={{
                left: p.x,
                top: p.y,
                width: Math.max(2, el.size.width * scale),
                height: Math.max(2, el.size.height * scale),
              }}
            />
          );
        })}
        <div
          className="absolute rounded-sm border border-signal bg-signal/10"
          style={{
            left: viewTopLeft.x,
            top: viewTopLeft.y,
            width: viewWorldW * scale,
            height: viewWorldH * scale,
          }}
        />
      </div>
    </Panel>
  );
}
