"use client";

import type { AnyElement, Connection } from "@nexus/types";

interface ConnectionsLayerProps {
  connections: Connection[];
  elements: Record<string, AnyElement>;
  selectedIds: Set<string>;
  onSelectConnection: (id: string, additive: boolean) => void;
  pending: { fromId: string; toWorld: { x: number; y: number } } | null;
}

function center(el: AnyElement) {
  return { x: el.position.x + el.size.width / 2, y: el.position.y + el.size.height / 2 };
}

function edgePoint(el: AnyElement, toward: { x: number; y: number }) {
  const c = center(el);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  const hw = el.size.width / 2;
  const hh = el.size.height / 2;
  if (dx === 0 && dy === 0) return c;
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

function threadPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
}

/** Short label for a connection endpoint, for the aria-label screen readers announce. */
function describeConnectionEndpoint(el: AnyElement): string {
  switch (el.type) {
    case "note":
    case "task":
    case "checklist":
    case "list":
      return el.data.title || el.type;
    default:
      return el.type;
  }
}

export function ConnectionsLayer({
  connections,
  elements,
  selectedIds,
  onSelectConnection,
  pending,
}: ConnectionsLayerProps) {
  return (
    <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
      <defs>
        <marker id="nx-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--color-signal))" />
        </marker>
      </defs>

      {connections.map((c) => {
        const source = elements[c.sourceId];
        const target = elements[c.targetId];
        if (!source || !target) return null;
        const a = edgePoint(source, center(target));
        const b = edgePoint(target, center(source));
        const isSelected = selectedIds.has(c.id);
        const sourceLabel = describeConnectionEndpoint(source);
        const targetLabel = describeConnectionEndpoint(target);
        return (
          <path
            key={c.id}
            d={threadPath(a, b)}
            fill="none"
            stroke={isSelected ? "rgb(var(--color-signal))" : "rgb(var(--color-text-faint))"}
            strokeWidth={isSelected ? 2.5 : 1.75}
            vectorEffect="non-scaling-stroke"
            markerEnd={c.direction === "one-way" ? "url(#nx-arrow)" : undefined}
            className="pointer-events-auto cursor-pointer transition-colors duration-fast focus:outline-none"
            tabIndex={0}
            role="button"
            aria-label={`Conexão de ${sourceLabel} para ${targetLabel}${c.label ? `: ${c.label}` : ""}`}
            aria-pressed={isSelected}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectConnection(c.id, e.shiftKey);
            }}
            onFocus={() => onSelectConnection(c.id, false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectConnection(c.id, false);
              }
            }}
          />
        );
      })}

      {pending
        ? (() => {
            const source = elements[pending.fromId];
            if (!source) return null;
            const a = edgePoint(source, pending.toWorld);
            return (
              <path
                d={threadPath(a, pending.toWorld)}
                fill="none"
                stroke="rgb(var(--color-signal))"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                className="nx-thread-animated"
                opacity={0.85}
              />
            );
          })()
        : null}
    </svg>
  );
}
