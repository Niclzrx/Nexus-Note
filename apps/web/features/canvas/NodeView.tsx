"use client";

import * as React from "react";
import type { AnyElement, ElementType } from "@nexus/types";
import { cx } from "@nexus/design-system";
import {
  GripHorizontal,
  Link2,
  StickyNote,
  Type,
  CheckSquare,
  ListChecks,
  List,
  Link as LinkIcon,
  Bookmark,
  Code2,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  File as FileIcon,
  MapPin,
} from "lucide-react";
import { NodeContent } from "./NodeContent";

interface NodeViewProps {
  element: AnyElement;
  selected: boolean;
  grouped: boolean;
  zoom: number;
  onPointerDownDrag: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent) => void;
  onConnectStart: (e: React.PointerEvent) => void;
  onSelect: (e: React.PointerEvent) => void;
  onFocusSelect: () => void;
  onContentChange: (patch: Record<string, unknown>) => void;
}

const TYPE_ICON: Record<ElementType, typeof StickyNote> = {
  note: StickyNote,
  text: Type,
  task: CheckSquare,
  checklist: ListChecks,
  list: List,
  link: LinkIcon,
  bookmark: Bookmark,
  code: Code2,
  image: ImageIcon,
  video: Video,
  audio: Music,
  pdf: FileText,
  file: FileIcon,
  location: MapPin,
};

const TYPE_ACCENT: Record<ElementType, string> = {
  note: "border-l-signal",
  text: "border-l-text-faint",
  task: "border-l-ember",
  checklist: "border-l-success",
  list: "border-l-success",
  link: "border-l-signal",
  bookmark: "border-l-signal",
  code: "border-l-text-faint",
  image: "border-l-text-faint",
  video: "border-l-text-faint",
  audio: "border-l-text-faint",
  pdf: "border-l-text-faint",
  file: "border-l-text-faint",
  location: "border-l-text-faint",
};

const TYPE_LABEL: Record<ElementType, string> = {
  note: "Nota",
  text: "Texto",
  task: "Tarefa",
  checklist: "Checklist",
  list: "Lista",
  link: "Link",
  bookmark: "Bookmark",
  code: "Código",
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
  pdf: "PDF",
  file: "Arquivo",
  location: "Local",
};

/** Short human-readable summary for screen readers — the visible title/text when the type has one, otherwise just the type name. */
function describeElement(element: AnyElement): string {
  const label = TYPE_LABEL[element.type];
  switch (element.type) {
    case "note":
      return `${label}: ${element.data.title || "sem título"}`;
    case "task":
      return `${label}: ${element.data.title || "sem título"}`;
    case "checklist":
      return `${label}: ${element.data.title || "sem título"}`;
    case "list":
      return `${label}: ${element.data.title || "sem título"}`;
    case "link":
      return `${label}: ${element.data.title || element.data.url || "sem título"}`;
    case "bookmark":
      return `${label}: ${element.data.title || "sem título"}`;
    default:
      return label;
  }
}

export const NodeView = React.memo(function NodeView({
  element,
  selected,
  grouped,
  zoom,
  onPointerDownDrag,
  onResizeStart,
  onConnectStart,
  onSelect,
  onFocusSelect,
  onContentChange,
}: NodeViewProps) {
  const Icon = TYPE_ICON[element.type];

  return (
    <div
      data-node-id={element.id}
      className={cx(
        "group absolute select-none rounded-lg border border-border bg-surface shadow-[0_4px_16px_-6px_rgb(var(--shadow-color)/0.45)]",
        "border-l-[3px]",
        TYPE_ACCENT[element.type],
        selected && "ring-2 ring-signal ring-offset-1 ring-offset-canvas-bg",
        // Tailwind's `ring-*` utilities are box-shadow based and cannot be
        // dashed (box-shadow has no line-style). `outline-dashed` is real
        // CSS outline-style, which does support it.
        grouped && !selected && "outline outline-dashed outline-1 outline-offset-1 outline-border-strong",
      )}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        zIndex: element.zIndex,
      }}
      onPointerDown={(e) => {
        // Without this, the event bubbles to Canvas.tsx's container-level
        // onPointerDown, which — since it has no "did this originate on a
        // node" check — treats it as a click on empty canvas and starts
        // marquee-selection, clobbering the `dragMode` this same event just
        // set to "move" a few lines below via onPointerDownDrag. React
        // batches both setDragMode calls from the same synchronous event,
        // so the container's runs last and wins: the node's own drag never
        // actually happens, a marquee box draws instead. Never caught by
        // build/type-check since it's a runtime interaction bug, not a
        // type error.
        e.stopPropagation();
        onSelect(e);
        onPointerDownDrag(e);
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={describeElement(element)}
        aria-pressed={selected}
        className="flex h-6 items-center justify-between rounded-t-lg border-b border-border/60 px-2 text-text-faint outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-inset"
        style={{ cursor: "grab" }}
        onFocus={onFocusSelect}
        onKeyDown={(e) => {
          // Enter/Space select — the same action a click performs. Delete
          // and arrow-key nudge are handled globally once selected (see
          // useKeyboardShortcuts in Canvas.tsx), not here, so they keep
          // working the same way regardless of whether focus is on this
          // header or anywhere else on the page.
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFocusSelect();
          }
        }}
      >
        <span className="flex items-center gap-1">
          <Icon className="h-3 w-3 opacity-60" />
          <GripHorizontal className="h-3 w-3 opacity-40" />
        </span>
        <button
          type="button"
          aria-label="Conectar"
          className="rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-surface-elevated hover:text-signal group-hover:opacity-100"
          style={{ opacity: selected ? 1 : undefined }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onConnectStart(e);
          }}
        >
          <Link2 className="h-3 w-3" />
        </button>
      </div>

      <div className="h-[calc(100%-24px)]">
        <NodeContent element={element} onChange={onContentChange} />
      </div>

      <div
        className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize rounded-tl border-l border-t border-border/60"
        style={{ transform: `scale(${1 / Math.max(zoom, 0.35)})`, transformOrigin: "bottom right" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(e);
        }}
      />
    </div>
  );
});
