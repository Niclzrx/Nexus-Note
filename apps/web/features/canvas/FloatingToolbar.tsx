"use client";

import { IconButton, Panel } from "@nexus/design-system";
import {
  MousePointer2,
  Hand,
  StickyNote,
  Type,
  CheckSquare,
  ListChecks,
  List,
  Link as LinkIcon,
  Bookmark,
  Code2,
  MapPin,
  Upload,
  Link2,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";
import type { CanvasTool } from "../../stores/ui-store";

interface FloatingToolbarProps {
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onUploadClick: () => void;
  visibleCount?: number;
  totalCount?: number;
}

const navigationTools: { id: CanvasTool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Seleção (V)", icon: MousePointer2 },
  { id: "pan", label: "Mão (Espaço)", icon: Hand },
];

const creationTools: { id: CanvasTool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "note", label: "Nota", icon: StickyNote },
  { id: "text", label: "Texto", icon: Type },
  { id: "task", label: "Tarefa", icon: CheckSquare },
  { id: "checklist", label: "Checklist", icon: ListChecks },
  { id: "list", label: "Lista", icon: List },
  { id: "link", label: "Link", icon: LinkIcon },
  { id: "bookmark", label: "Bookmark", icon: Bookmark },
  { id: "code", label: "Código", icon: Code2 },
  { id: "location", label: "Local", icon: MapPin },
  { id: "connect", label: "Conectar", icon: Link2 },
];

export function FloatingToolbar({
  activeTool,
  onToolChange,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFit,
  onUploadClick,
  visibleCount,
  totalCount,
}: FloatingToolbarProps) {
  return (
    <Panel
      elevated
      className="pointer-events-auto absolute bottom-5 left-1/2 z-floating-toolbar flex max-w-[92vw] -translate-x-1/2 items-center gap-1 overflow-x-auto p-1.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {navigationTools.map((tool) => (
        <IconButton
          key={tool.id}
          label={tool.label}
          active={activeTool === tool.id}
          onClick={() => onToolChange(tool.id)}
        >
          <tool.icon />
        </IconButton>
      ))}

      <div className="mx-1 h-5 w-px shrink-0 bg-border" />

      {creationTools.map((tool) => (
        <IconButton
          key={tool.id}
          label={tool.label}
          size="sm"
          active={activeTool === tool.id}
          onClick={() => onToolChange(tool.id)}
        >
          <tool.icon />
        </IconButton>
      ))}

      <div className="mx-1 h-5 w-px shrink-0 bg-border" />

      <IconButton label="Enviar arquivo" size="sm" onClick={onUploadClick}>
        <Upload />
      </IconButton>

      <div className="mx-1 h-5 w-px shrink-0 bg-border" />

      <IconButton label="Diminuir zoom" size="sm" onClick={onZoomOut}>
        <ZoomOut />
      </IconButton>
      <span className="w-10 shrink-0 text-center font-mono text-xs text-text-muted">{zoomPercent}%</span>
      <IconButton label="Aumentar zoom" size="sm" onClick={onZoomIn}>
        <ZoomIn />
      </IconButton>
      <IconButton label="Ajustar à tela" size="sm" onClick={onFit}>
        <Maximize />
      </IconButton>

      {totalCount !== undefined && totalCount > 500 ? (
        <>
          <div className="mx-1 h-5 w-px shrink-0 bg-border" />
          <span
            className="shrink-0 whitespace-nowrap px-1 font-mono text-[10px] text-text-faint"
            title="Nós renderizados no DOM vs. total no board — só os visíveis (+ margem) são montados"
          >
            {visibleCount}/{totalCount} nós
          </span>
        </>
      ) : null}
    </Panel>
  );
}
