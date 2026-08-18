"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Board, ElementType, Point } from "@nexus/types";
import { screenToWorld, screenRectToWorld, normalizeRect, clampZoom } from "@nexus/canvas";
import { useCanvasStore } from "../../stores/canvas-store";
import { useElementStore } from "../../stores/element-store";
import { useSelectionStore } from "../../stores/selection-store";
import { useHistoryStore } from "../../stores/history-store";
import { useUiStore } from "../../stores/ui-store";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import { useElementSize } from "../../hooks/use-element-size";
import { CanvasBackground } from "./CanvasBackground";
import { NodeView } from "./NodeView";
import { ConnectionsLayer } from "./ConnectionsLayer";
import { FloatingToolbar } from "./FloatingToolbar";
import { PropertyPanel } from "./PropertyPanel";
import { Minimap } from "./Minimap";

type DragMode = "none" | "pan" | "marquee" | "move" | "resize" | "connect";

const CREATABLE_TYPES: ElementType[] = [
  "note",
  "text",
  "task",
  "checklist",
  "list",
  "link",
  "bookmark",
  "code",
  "location",
];

export function Canvas({ board }: { board: Board }) {
  const { ref: containerRef, size: containerSize } = useElementSize<HTMLDivElement>();
  const viewport = useCanvasStore((s) => s.viewport);
  const gridEnabled = useCanvasStore((s) => s.gridEnabled);
  const pan = useCanvasStore((s) => s.pan);
  const zoomTo = useCanvasStore((s) => s.zoomTo);
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);

  const elements = useElementStore((s) => s.elements);
  const connections = useElementStore((s) => s.connections);
  const grid = useElementStore((s) => s.grid);
  const createElement = useElementStore((s) => s.createElement);
  const createMediaElement = useElementStore((s) => s.createMediaElement);
  const updateElementData = useElementStore((s) => s.updateElementData);
  const updateElementTags = useElementStore((s) => s.updateElementTags);
  const beginMove = useElementStore((s) => s.beginMove);
  const moveElements = useElementStore((s) => s.moveElements);
  const commitMove = useElementStore((s) => s.commitMove);
  const beginResize = useElementStore((s) => s.beginResize);
  const resizeElement = useElementStore((s) => s.resizeElement);
  const commitResize = useElementStore((s) => s.commitResize);
  const deleteElements = useElementStore((s) => s.deleteElements);
  const createConnection = useElementStore((s) => s.createConnection);
  const deleteConnections = useElementStore((s) => s.deleteConnections);
  const groupMembers = useElementStore((s) => s.groupMembers);
  const groupElements = useElementStore((s) => s.groupElements);
  const ungroupElements = useElementStore((s) => s.ungroupElements);
  const duplicateElements = useElementStore((s) => s.duplicateElements);

  const selectedElementIds = useSelectionStore((s) => s.elementIds);
  const selectedConnectionIds = useSelectionStore((s) => s.connectionIds);
  const selectOnly = useSelectionStore((s) => s.selectOnly);
  const toggleSel = useSelectionStore((s) => s.toggle);
  const selectMany = useSelectionStore((s) => s.selectMany);
  const selectConnection = useSelectionStore((s) => s.selectConnection);
  const clearSelection = useSelectionStore((s) => s.clear);

  const activeTool = useUiStore((s) => s.activeTool);
  const setActiveTool = useUiStore((s) => s.setActiveTool);
  const pendingFocusElementId = useUiStore((s) => s.pendingFocusElementId);
  const setPendingFocusElementId = useUiStore((s) => s.setPendingFocusElementId);

  const [dragMode, setDragMode] = useState<DragMode>("none");
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ fromId: string; toWorld: Point } | null>(null);
  const [spacePanning, setSpacePanning] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastScreenPoint = useRef<Point>({ x: 0, y: 0 });
  const marqueeStart = useRef<Point>({ x: 0, y: 0 });
  const marqueeAdditive = useRef(false);
  const movingIds = useRef<string[]>([]);
  const resizingId = useRef<string | null>(null);
  const resizeStartWorld = useRef<Point>({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const resizeStartPos = useRef<Point>({ x: 0, y: 0 });

  const elementList = useMemo(() => Object.values(elements), [elements]);
  const connectionList = useMemo(() => Object.values(connections), [connections]);
  const selectedElements = useMemo(
    () => elementList.filter((el) => selectedElementIds.has(el.id)),
    [elementList, selectedElementIds],
  );

  // ---- Fase 5: viewport-culled rendering ----
  // Only nodes whose bounds intersect the (padded) visible world rect get
  // mounted in the DOM. `grid` (the SpatialGrid) is a mutable instance the
  // store updates in place, so it has no reference change to key a memo on
  // by itself — but every store mutation that touches it also produces a
  // new `elements` object, which we key on instead as the "something
  // changed, requery" signal. Padding is expressed in WORLD units (scaled
  // by 1/zoom) so it represents a constant on-screen margin regardless of
  // zoom level, and exists so nodes just outside the viewport are already
  // mounted before they scroll into view, avoiding visible pop-in.
  const viewportWorldBounds = useMemo(() => {
    const paddingWorld = 400 / viewport.zoom;
    return {
      x: viewport.x - paddingWorld,
      y: viewport.y - paddingWorld,
      width: containerSize.width / viewport.zoom + paddingWorld * 2,
      height: containerSize.height / viewport.zoom + paddingWorld * 2,
    };
  }, [viewport.x, viewport.y, viewport.zoom, containerSize.width, containerSize.height]);

  const visibleElements = useMemo(() => {
    // Before the container's first ResizeObserver measurement, width is 0
    // and querying would cull everything — show the full list briefly
    // rather than flash an empty canvas on first paint.
    if (containerSize.width === 0) return elementList;
    const visibleIds = new Set(grid.query(viewportWorldBounds));
    // A node being actively dragged/resized must never disappear mid-
    // gesture even if the pointer has moved it outside the padded bounds.
    for (const id of movingIds.current) visibleIds.add(id);
    if (resizingId.current) visibleIds.add(resizingId.current);
    return elementList.filter((el) => visibleIds.has(el.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, elementList, grid, viewportWorldBounds, containerSize.width]);

  const toContainerPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [containerRef],
  );

  // ---- Arriving from a global search result (Command Palette) ----
  // Wait until this board's elements are loaded AND we have a real
  // container size to center against — using containerSize here (rather
  // than guessing window size minus sidebar/navbar, as an earlier version
  // did) is correct regardless of sidebar collapse state or window size.
  useEffect(() => {
    if (!pendingFocusElementId) return;
    const target = elements[pendingFocusElementId];
    if (!target || containerSize.width === 0) return;

    selectOnly(target.id);
    const centerX = target.position.x + target.size.width / 2;
    const centerY = target.position.y + target.size.height / 2;
    useCanvasStore.setState((s) => ({
      viewport: {
        zoom: 1,
        x: centerX - containerSize.width / 2,
        y: centerY - containerSize.height / 2,
      },
    }));
    setPendingFocusElementId(null);
  }, [pendingFocusElementId, elements, containerSize, selectOnly, setPendingFocusElementId]);

  // ---- Wheel: pan (default) / zoom (ctrl+wheel or pinch) ----
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const anchor = toContainerPoint(e.clientX, e.clientY);
        const nextZoom = clampZoom(viewport.zoom * Math.exp(-e.deltaY * 0.0025));
        zoomTo(anchor, nextZoom);
      } else {
        pan(-e.deltaX, -e.deltaY);
      }
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [containerRef, pan, zoomTo, viewport.zoom, toContainerPoint]);

  // ---- Pointer down on empty canvas ----
  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) return;
      const screenPoint = toContainerPoint(e.clientX, e.clientY);
      lastScreenPoint.current = screenPoint;

      const shouldPan = activeTool === "pan" || spacePanning || e.button === 1;
      if (shouldPan) {
        setDragMode("pan");
        (e.target as Element).setPointerCapture(e.pointerId);
        return;
      }

      if (CREATABLE_TYPES.includes(activeTool as ElementType)) {
        const worldPoint = screenToWorld(screenPoint, viewport);
        const created = createElement(activeTool as ElementType, {
          x: worldPoint.x - 120,
          y: worldPoint.y - 60,
        });
        selectOnly(created.id);
        setActiveTool("select");
        return;
      }

      // select tool on empty canvas -> marquee
      if (!e.shiftKey) clearSelection();
      marqueeAdditive.current = e.shiftKey;
      marqueeStart.current = screenPoint;
      setMarqueeRect({ x: screenPoint.x, y: screenPoint.y, width: 0, height: 0 });
      setDragMode("marquee");
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [activeTool, spacePanning, toContainerPoint, viewport, createElement, selectOnly, setActiveTool, clearSelection],
  );

  const onNodeSelect = useCallback(
    (id: string, e: React.PointerEvent) => {
      const ids = groupMembers(id);
      if (e.shiftKey) {
        if (ids.length > 1) selectMany(ids, true);
        else toggleSel(id);
      } else if (!selectedElementIds.has(id)) {
        selectMany(ids, false);
      }
    },
    [selectedElementIds, toggleSel, selectMany, groupMembers],
  );

  const onNodeDragStart = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (activeTool !== "select") return;
      const groupIds = groupMembers(id);
      const ids = selectedElementIds.has(id)
        ? Array.from(selectedElementIds)
        : groupIds.length > 1
          ? groupIds
          : [id];
      movingIds.current = ids;
      beginMove(ids);
      lastScreenPoint.current = toContainerPoint(e.clientX, e.clientY);
      setDragMode("move");
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [activeTool, selectedElementIds, beginMove, toContainerPoint, groupMembers],
  );

  const onNodeResizeStart = useCallback(
    (id: string, e: React.PointerEvent) => {
      const el = elements[id];
      if (!el) return;
      resizingId.current = id;
      resizeStartWorld.current = screenToWorld(toContainerPoint(e.clientX, e.clientY), viewport);
      resizeStartSize.current = { ...el.size };
      resizeStartPos.current = { ...el.position };
      beginResize(id);
      setDragMode("resize");
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [elements, viewport, toContainerPoint, beginResize],
  );

  const onNodeConnectStart = useCallback(
    (id: string, e: React.PointerEvent) => {
      setPendingConnection({ fromId: id, toWorld: screenToWorld(toContainerPoint(e.clientX, e.clientY), viewport) });
      setDragMode("connect");
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [toContainerPoint, viewport],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const screenPoint = toContainerPoint(e.clientX, e.clientY);

      if (dragMode === "pan") {
        const dx = screenPoint.x - lastScreenPoint.current.x;
        const dy = screenPoint.y - lastScreenPoint.current.y;
        pan(dx, dy);
        lastScreenPoint.current = screenPoint;
        return;
      }

      if (dragMode === "marquee") {
        setMarqueeRect(normalizeRect(marqueeStart.current, screenPoint));
        return;
      }

      if (dragMode === "move") {
        const dxScreen = screenPoint.x - lastScreenPoint.current.x;
        const dyScreen = screenPoint.y - lastScreenPoint.current.y;
        moveElements(movingIds.current, dxScreen / viewport.zoom, dyScreen / viewport.zoom);
        lastScreenPoint.current = screenPoint;
        return;
      }

      if (dragMode === "resize" && resizingId.current) {
        const worldPoint = screenToWorld(screenPoint, viewport);
        const dx = worldPoint.x - resizeStartWorld.current.x;
        const dy = worldPoint.y - resizeStartWorld.current.y;
        const width = Math.max(160, resizeStartSize.current.width + dx);
        const height = Math.max(90, resizeStartSize.current.height + dy);
        resizeElement(resizingId.current, { width, height }, resizeStartPos.current);
        return;
      }

      if (dragMode === "connect") {
        setPendingConnection((p) => (p ? { ...p, toWorld: screenToWorld(screenPoint, viewport) } : p));
        return;
      }
    },
    [dragMode, pan, moveElements, resizeElement, toContainerPoint, viewport],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragMode === "marquee" && marqueeRect) {
        const worldRect = screenRectToWorld(marqueeRect, viewport);
        if (worldRect.width > 2 && worldRect.height > 2) {
          const hitIds = grid.query(worldRect);
          const expanded = new Set<string>();
          for (const id of hitIds) {
            for (const memberId of groupMembers(id)) expanded.add(memberId);
          }
          selectMany(Array.from(expanded), marqueeAdditive.current);
        }
      }

      if (dragMode === "move") {
        commitMove();
        movingIds.current = [];
      }

      if (dragMode === "resize") {
        commitResize();
        resizingId.current = null;
      }

      if (dragMode === "connect" && pendingConnection) {
        const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-node-id]");
        const targetId = targetEl?.getAttribute("data-node-id");
        if (targetId && targetId !== pendingConnection.fromId) {
          createConnection(pendingConnection.fromId, targetId);
        }
        setPendingConnection(null);
      }

      setDragMode("none");
      setMarqueeRect(null);
    },
    [dragMode, marqueeRect, viewport, grid, selectMany, groupMembers, commitMove, commitResize, pendingConnection, createConnection],
  );

  const zoomPercent = Math.round(viewport.zoom * 100);

  const handleFiles = useCallback(
    async (fileList: FileList | File[], worldPoint: Point) => {
      const files = Array.from(fileList);
      const createdIds: string[] = [];
      let i = 0;
      for (const file of files) {
        const offset = i * 24;
        i += 1;
        const created = await createMediaElement(file, { x: worldPoint.x + offset, y: worldPoint.y + offset });
        if (created) createdIds.push(created.id);
      }
      if (createdIds.length > 0) selectMany(createdIds, false);
    },
    [createMediaElement, selectMany],
  );

  const onCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFiles(false);
      if (!e.dataTransfer.files?.length) return;
      const worldPoint = screenToWorld(toContainerPoint(e.clientX, e.clientY), viewport);
      void handleFiles(e.dataTransfer.files, { x: worldPoint.x - 100, y: worldPoint.y - 60 });
    },
    [handleFiles, toContainerPoint, viewport],
  );

  const onUploadInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const center = screenToWorld({ x: containerSize.width / 2, y: containerSize.height / 2 }, viewport);
      void handleFiles(e.target.files, { x: center.x - 100, y: center.y - 60 });
      e.target.value = "";
    },
    [handleFiles, viewport, containerSize],
  );

  const handleDelete = useCallback(() => {
    // Read the CURRENT selection straight from the store rather than the
    // `selectedElementIds`/`selectedConnectionIds` closed over by this
    // callback. This is what was actually causing "select something, press
    // Delete, the selection ring disappears but nothing is removed": if
    // this callback ran with even a slightly stale closure (empty
    // selection), the delete calls were skipped by their `size > 0` guards
    // but `clearSelection()` below still ran unconditionally — wiping the
    // real, current selection in the store without deleting anything.
    // Reading fresh state here removes the possibility of that mismatch
    // entirely, rather than just reordering around it.
    const { elementIds, connectionIds } = useSelectionStore.getState();
    if (elementIds.size === 0 && connectionIds.size === 0) return;
    if (elementIds.size > 0) deleteElements(Array.from(elementIds));
    if (connectionIds.size > 0) deleteConnections(Array.from(connectionIds));
    clearSelection();
  }, [deleteElements, deleteConnections, clearSelection]);

  const navigateTo = useCallback(
    (worldX: number, worldY: number) => {
      useCanvasStore.setState((s) => ({
        viewport: {
          ...s.viewport,
          x: worldX - containerSize.width / 2 / s.viewport.zoom,
          y: worldY - containerSize.height / 2 / s.viewport.zoom,
        },
      }));
    },
    [containerSize.width, containerSize.height],
  );

  useKeyboardShortcuts({
    onUndo: () => useHistoryStore.getState().undo(),
    onRedo: () => useHistoryStore.getState().redo(),
    onDelete: handleDelete,
    onSelectAll: () => selectMany(elementList.map((e) => e.id), false),
    onCommandPalette: () => useUiStore.getState().setCommandPaletteOpen(true),
    onEscape: () => {
      clearSelection();
      setActiveTool("select");
    },
    onPanToolHold: setSpacePanning,
    onGroup: () => {
      if (selectedElementIds.size >= 2) groupElements(Array.from(selectedElementIds));
    },
    onUngroup: () => {
      if (selectedElementIds.size >= 1) ungroupElements(Array.from(selectedElementIds));
    },
    onDuplicate: () => {
      const { elementIds } = useSelectionStore.getState();
      if (elementIds.size === 0) return;
      const newIds = duplicateElements(Array.from(elementIds));
      if (newIds.length > 0) selectMany(newIds, false);
    },
  });

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{ cursor: dragMode === "pan" ? "grabbing" : spacePanning || activeTool === "pan" ? "grab" : "default" }}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFiles(true);
      }}
      onDragLeave={() => setIsDraggingFiles(false)}
      onDrop={onCanvasDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onUploadInputChange}
        accept="image/*,video/*,audio/*,application/pdf,*"
      />
      <CanvasBackground viewport={viewport} enabled={gridEnabled} />

      <div
        className="absolute left-0 top-0 h-0 w-0"
        style={{
          transform: `translate(${-viewport.x * viewport.zoom}px, ${-viewport.y * viewport.zoom}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <ConnectionsLayer
          connections={connectionList}
          elements={elements}
          selectedIds={selectedConnectionIds}
          onSelectConnection={selectConnection}
          pending={pendingConnection}
        />
        {visibleElements.map((el) => (
          <NodeView
            key={el.id}
            element={el}
            selected={selectedElementIds.has(el.id)}
            grouped={Boolean(el.groupId)}
            zoom={viewport.zoom}
            onSelect={(e) => onNodeSelect(el.id, e)}
            onPointerDownDrag={(e) => onNodeDragStart(el.id, e)}
            onResizeStart={(e) => onNodeResizeStart(el.id, e)}
            onConnectStart={(e) => onNodeConnectStart(el.id, e)}
            onContentChange={(patch) => updateElementData(el.id, patch)}
          />
        ))}
      </div>

      {isDraggingFiles ? (
        <div className="pointer-events-none absolute inset-2 z-canvas-overlay flex items-center justify-center rounded-xl border-2 border-dashed border-signal bg-signal/5">
          <p className="font-display text-sm text-signal">Solte para adicionar ao board</p>
        </div>
      ) : null}

      {marqueeRect ? (
        <div
          className="pointer-events-none absolute z-canvas-overlay rounded-sm border border-signal bg-signal/10"
          style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.width, height: marqueeRect.height }}
        />
      ) : null}

      {elementList.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-sm text-text-muted">Este board está vazio</p>
            <p className="mt-1 text-xs text-text-faint">
              Escolha uma ferramenta na barra abaixo e clique no canvas para criar seu primeiro elemento
            </p>
          </div>
        </div>
      ) : null}

      <PropertyPanel
        selectedElements={selectedElements}
        board={board}
        gridEnabled={gridEnabled}
        onToggleGrid={toggleGrid}
        onDelete={handleDelete}
        onGroup={() => groupElements(Array.from(selectedElementIds))}
        onUngroup={() => ungroupElements(Array.from(selectedElementIds))}
        onTagsChange={updateElementTags}
      />

      <FloatingToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        zoomPercent={zoomPercent}
        onZoomIn={() => zoomTo({ x: containerSize.width / 2, y: containerSize.height / 2 }, viewport.zoom * 1.2)}
        onZoomOut={() => zoomTo({ x: containerSize.width / 2, y: containerSize.height / 2 }, viewport.zoom / 1.2)}
        onFit={resetViewport}
        onUploadClick={() => fileInputRef.current?.click()}
        visibleCount={visibleElements.length}
        totalCount={elementList.length}
      />

      <Minimap elements={elementList} viewport={viewport} viewportSize={containerSize} onNavigate={navigateTo} />
    </div>
  );
}
