"use client";

import { Panel, cx } from "@nexus/design-system";
import type { AnyElement, Board } from "@nexus/types";
import { Grid3x3, Group as GroupIcon, Trash2, Ungroup } from "lucide-react";
import { TagEditor } from "./TagEditor";
import { useIsMobile } from "../../hooks/use-media-query";

interface PropertyPanelProps {
  selectedElements: AnyElement[];
  board: Board | null;
  gridEnabled: boolean;
  onToggleGrid: () => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onTagsChange: (id: string, tags: string[]) => void;
}

export function PropertyPanel({
  selectedElements,
  board,
  gridEnabled,
  onToggleGrid,
  onDelete,
  onGroup,
  onUngroup,
  onTagsChange,
}: PropertyPanelProps) {
  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const isGrouped = selectedElements.some((el) => el.groupId);
  const isMobile = useIsMobile();

  // On mobile there's no room to permanently dock a board-settings panel —
  // it would sit over the canvas even with nothing selected. Desktop keeps
  // it always visible (top-right, out of the way); mobile only surfaces it
  // once there's something to actually act on.
  if (isMobile && selectedElements.length === 0) return null;

  return (
    <Panel
      elevated
      className={cx(
        "pointer-events-auto z-panel overflow-hidden",
        // Mobile: a bottom sheet, positioned above the floating toolbar
        // rather than a small floating box that would crowd a narrow
        // screen or overlap other controls.
        "fixed inset-x-3 bottom-24 rounded-xl",
        // Desktop: the original floating top-right panel.
        "md:absolute md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:w-64 md:rounded-lg",
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="border-b border-border px-3.5 py-2.5">
        <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-text-muted">
          {selectedElements.length === 0
            ? "Board"
            : selectedElements.length === 1
              ? "Elemento"
              : `${selectedElements.length} elementos`}
        </h3>
      </div>

      <div className="nx-scroll max-h-[60vh] overflow-y-auto p-3.5">
        {selectedElements.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">{board?.name}</p>
            <button
              type="button"
              onClick={onToggleGrid}
              className="flex w-full items-center justify-between rounded-md border border-border px-2.5 py-2 text-xs text-text-muted transition-colors hover:border-border-strong"
            >
              <span className="flex items-center gap-2">
                <Grid3x3 className="h-3.5 w-3.5" /> Grid
              </span>
              <span className={gridEnabled ? "text-signal" : "text-text-faint"}>
                {gridEnabled ? "Ativado" : "Desativado"}
              </span>
            </button>
          </div>
        ) : single ? (
          <div className="space-y-3 text-xs text-text-muted">
            <div>
              <span className="text-text-faint">Posição</span>
              <p className="font-mono text-text">
                x {Math.round(single.position.x)} · y {Math.round(single.position.y)}
              </p>
            </div>
            <div>
              <span className="text-text-faint">Tamanho</span>
              <p className="font-mono text-text">
                {Math.round(single.size.width)} × {Math.round(single.size.height)}
              </p>
            </div>
            <TagEditor tags={single.tags} onChange={(tags) => onTagsChange(single.id, tags)} />
            {single.groupId ? (
              <button
                type="button"
                onClick={onUngroup}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-text-muted transition-colors hover:border-border-strong"
              >
                <Ungroup className="h-3.5 w-3.5" /> Desagrupar
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-error/30 bg-error/10 px-2.5 py-2 text-error transition-colors hover:bg-error/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-text-faint">
              {selectedElements.length} elementos selecionados.
            </p>
            {isGrouped ? (
              <button
                type="button"
                onClick={onUngroup}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-xs text-text-muted transition-colors hover:border-border-strong"
              >
                <Ungroup className="h-3.5 w-3.5" /> Desagrupar
              </button>
            ) : (
              <button
                type="button"
                onClick={onGroup}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-xs text-text-muted transition-colors hover:border-border-strong"
              >
                <GroupIcon className="h-3.5 w-3.5" /> Agrupar (Ctrl+G)
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-error/30 bg-error/10 px-2.5 py-2 text-xs text-error transition-colors hover:bg-error/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir seleção
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}
