import { create } from "zustand";
import type { CanvasViewport } from "@nexus/types";
import { DEFAULT_VIEWPORT } from "@nexus/types";
import { storageService } from "@nexus/storage";
import { clampZoom, panByScreenDelta, zoomAtPoint } from "@nexus/canvas";

interface CanvasState {
  boardId: string | null;
  viewport: CanvasViewport;
  gridEnabled: boolean;

  loadForBoard: (boardId: string, viewport: CanvasViewport, gridEnabled: boolean) => void;
  pan: (dx: number, dy: number) => void;
  zoomTo: (anchor: { x: number; y: number }, nextZoom: number) => void;
  setZoomPercent: (percent: number, center: { x: number; y: number }) => void;
  resetViewport: () => void;
  toggleGrid: () => void;
}

// Keyed by boardId rather than a single shared timer: with one shared
// timer, panning board A then quickly switching to board B would have B's
// debounce call `clearTimeout` on A's still-pending save, silently
// dropping A's last viewport change before it ever reached IndexedDB.
const viewportSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
function persistViewport(boardId: string, viewport: CanvasViewport) {
  const existing = viewportSaveTimers.get(boardId);
  if (existing) clearTimeout(existing);
  const timeoutId = setTimeout(() => {
    viewportSaveTimers.delete(boardId);
    void storageService.boards.get(boardId).then((board) => {
      if (!board) return;
      void storageService.boards.put({ ...board, viewport, updatedAt: Date.now() });
    });
  }, 500);
  viewportSaveTimers.set(boardId, timeoutId);
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  boardId: null,
  viewport: { ...DEFAULT_VIEWPORT },
  gridEnabled: true,

  loadForBoard: (boardId, viewport, gridEnabled) => set({ boardId, viewport, gridEnabled }),

  pan: (dx, dy) =>
    set((s) => {
      const viewport = panByScreenDelta(s.viewport, dx, dy);
      if (s.boardId) persistViewport(s.boardId, viewport);
      return { viewport };
    }),

  zoomTo: (anchor, nextZoom) =>
    set((s) => {
      const viewport = zoomAtPoint(s.viewport, anchor, nextZoom);
      if (s.boardId) persistViewport(s.boardId, viewport);
      return { viewport };
    }),

  setZoomPercent: (percent, center) => {
    const nextZoom = clampZoom(percent / 100);
    get().zoomTo(center, nextZoom);
  },

  resetViewport: () =>
    set((s) => {
      const viewport = { ...DEFAULT_VIEWPORT };
      if (s.boardId) persistViewport(s.boardId, viewport);
      return { viewport };
    }),

  toggleGrid: () => set((s) => ({ gridEnabled: !s.gridEnabled })),
}));
