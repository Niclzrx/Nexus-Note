"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Board } from "@nexus/types";
import { DEFAULT_BOARD_SETTINGS, DEFAULT_VIEWPORT } from "@nexus/types";
import { storageService } from "@nexus/storage";
import { Canvas } from "../../../../features/canvas/Canvas";
import { BoardNavbar } from "../../../../features/shell/BoardNavbar";
import { useCanvasStore } from "../../../../stores/canvas-store";
import { useElementStore } from "../../../../stores/element-store";
import { useSelectionStore } from "../../../../stores/selection-store";
import { useWorkspaceStore } from "../../../../stores/workspace-store";
import { useUiStore } from "../../../../stores/ui-store";
import { useSyncStore } from "../../../../stores/sync-store";
import { getSharedBoardMeta } from "../../../../lib/supabase/documents";

export default function BoardPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const [board, setBoard] = useState<Board | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadBoardElements = useElementStore((s) => s.loadBoard);
  const resetElements = useElementStore((s) => s.reset);
  const loadViewport = useCanvasStore((s) => s.loadForBoard);
  const clearSelection = useSelectionStore((s) => s.clear);
  const touchLastOpened = useWorkspaceStore((s) => s.touchLastOpened);
  const setSaveStatus = useUiStore((s) => s.setSaveStatus);

  useEffect(() => {
    let cancelled = false;
    setBoard(null);
    setNotFound(false);
    clearSelection();
    setSaveStatus("saving");

    storageService.boards.get(boardId).then(async (record) => {
      if (cancelled) return;

      // Found locally — proceed normally
      if (record) {
        setBoard(record);
        loadViewport(record.id, record.viewport, record.settings.gridEnabled);
        await loadBoardElements(record.id);
        void touchLastOpened(record.id);
        if (!cancelled) setSaveStatus("saved");
        return;
      }

      // Not found locally — check if it's a shared board
      const sharedMeta = await getSharedBoardMeta(boardId);
      if (cancelled) return;

      if (!sharedMeta) {
        setNotFound(true);
        return;
      }

      // Create a minimal local board record for the shared board
      const now = Date.now();
      const localBoard: Board = {
        id: sharedMeta.id,
        workspaceId: "shared",
        name: sharedMeta.title,
        isFavorite: false,
        isTrashed: false,
        lastOpenedAt: now,
        viewport: DEFAULT_VIEWPORT,
        settings: DEFAULT_BOARD_SETTINGS,
        elementCount: 0,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      // Persist to local IndexedDB so subsequent visits don't hit Supabase again
      await storageService.boards.put(localBoard);

      // Mark as shared in sync store
      useSyncStore.setState({ isShared: true });

      setBoard(localBoard);
      loadViewport(localBoard.id, localBoard.viewport, localBoard.settings.gridEnabled);
      await loadBoardElements(localBoard.id);
      void touchLastOpened(localBoard.id);
      if (!cancelled) setSaveStatus("saved");
    });

    return () => {
      cancelled = true;
      resetElements();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  if (notFound) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Board não encontrado.
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
      </div>
    );
  }

  return (
    // key={board.id}: Next.js reuses this page's component instance when
    // navigating between two boards under the same [boardId] route (it
    // doesn't remount by default). Without the key, BoardNavbar's internal
    // `name` input state and Canvas's internal drag/selection refs would
    // carry over stale values from the previous board.
    <div key={board.id} className="flex h-full flex-col">
      <BoardNavbar board={board} />
      <div className="relative flex-1">
        <Canvas board={board} />
      </div>
    </div>
  );
}
