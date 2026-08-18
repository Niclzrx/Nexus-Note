import type { Bounds, CanvasViewport, Point } from "@nexus/types";

/**
 * Coordinate systems (see docs/canvas.md):
 *
 *  - Screen space: pixels relative to the canvas <div>'s top-left corner.
 *  - World space:  the infinite plane elements live in. `viewport.{x,y}` is
 *    the world-space point currently under the screen's top-left corner.
 *
 * screenPoint = (worldPoint - viewportOrigin) * zoom
 * worldPoint  = viewportOrigin + screenPoint / zoom
 */

export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 4;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function screenToWorld(screenPoint: Point, viewport: CanvasViewport): Point {
  return {
    x: viewport.x + screenPoint.x / viewport.zoom,
    y: viewport.y + screenPoint.y / viewport.zoom,
  };
}

export function worldToScreen(worldPoint: Point, viewport: CanvasViewport): Point {
  return {
    x: (worldPoint.x - viewport.x) * viewport.zoom,
    y: (worldPoint.y - viewport.y) * viewport.zoom,
  };
}

/** Pans the viewport by a delta expressed in screen pixels. */
export function panByScreenDelta(
  viewport: CanvasViewport,
  dx: number,
  dy: number,
): CanvasViewport {
  return {
    ...viewport,
    x: viewport.x - dx / viewport.zoom,
    y: viewport.y - dy / viewport.zoom,
  };
}

/**
 * Zooms the viewport to `nextZoom`, keeping the world point currently under
 * `anchorScreenPoint` visually fixed — this is what makes scroll-to-zoom
 * feel like it's zooming "into" the cursor instead of the canvas center.
 */
export function zoomAtPoint(
  viewport: CanvasViewport,
  anchorScreenPoint: Point,
  nextZoom: number,
): CanvasViewport {
  const clamped = clampZoom(nextZoom);
  const worldBefore = screenToWorld(anchorScreenPoint, viewport);
  return {
    zoom: clamped,
    x: worldBefore.x - anchorScreenPoint.x / clamped,
    y: worldBefore.y - anchorScreenPoint.y / clamped,
  };
}

export function screenRectToWorld(
  rect: Bounds,
  viewport: CanvasViewport,
): Bounds {
  const topLeft = screenToWorld({ x: rect.x, y: rect.y }, viewport);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width / viewport.zoom,
    height: rect.height / viewport.zoom,
  };
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function boundsContainsPoint(bounds: Bounds, point: Point): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function normalizeRect(a: Point, b: Point): Bounds {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}
