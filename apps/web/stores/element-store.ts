import { create } from "zustand";
import type { AnyElement, Asset, Connection, ElementType, Group, Point, Size } from "@nexus/types";
import { createDefaultElementData, DEFAULT_ELEMENT_SIZE } from "@nexus/types";
import { storageService, createId } from "@nexus/storage";
import { SpatialGrid } from "@nexus/canvas";
import { useHistoryStore, type Command } from "./history-store";
import { useWorkspaceStore } from "./workspace-store";
import { classifyFile, readImageDimensions, validateFile } from "../lib/file-classification";

interface ElementState {
  boardId: string | null;
  elements: Record<string, AnyElement>;
  connections: Record<string, Connection>;
  groups: Record<string, Group>;
  grid: SpatialGrid;
  loading: boolean;

  loadBoard: (boardId: string) => Promise<void>;

  dragSnapshot: Record<string, Point> | null;
  resizeSnapshot: { id: string; size: Size; position: Point } | null;

  createElement: (type: ElementType, position: Point) => AnyElement;
  seedSyntheticElements: (count: number) => Promise<void>;
  duplicateElements: (ids: string[]) => string[];
  createMediaElement: (file: File, position: Point) => Promise<AnyElement | null>;
  updateElementData: (id: string, patch: Record<string, unknown>) => void;
  updateElementTags: (id: string, tags: string[]) => void;

  beginMove: (ids: string[]) => void;
  moveElements: (ids: string[], dx: number, dy: number) => void;
  commitMove: () => void;

  beginResize: (id: string) => void;
  resizeElement: (id: string, size: Size, position: Point) => void;
  commitResize: () => void;

  deleteElements: (ids: string[]) => void;

  createConnection: (sourceId: string, targetId: string) => void;
  deleteConnections: (ids: string[]) => void;

  groupMembers: (elementId: string) => string[];
  groupElements: (ids: string[]) => void;
  ungroupElements: (ids: string[]) => void;

  reset: () => void;
}

function persistElement(el: AnyElement) {
  void storageService.elements.put(el);
}
function persistConnection(c: Connection) {
  void storageService.connections.put(c);
}
function persistGroup(g: Group) {
  void storageService.groups.put(g);
}

/**
 * Keeps `Board.elementCount` (shown in Dashboard/Sidebar) in sync with the
 * actual element count. Recomputed from the in-memory map rather than
 * incremented/decremented in place, so it self-heals if it's ever drifted —
 * cheap enough at the scale a single local board reaches.
 */
function syncBoardElementCount(boardId: string, count: number) {
  void storageService.boards.get(boardId).then((board) => {
    if (!board || board.elementCount === count) return;
    void storageService.boards.put({ ...board, elementCount: count, updatedAt: Date.now() });
    void useWorkspaceStore.getState().refreshBoards();
  });
}

/** Fits `natural` image dimensions inside `bounds` while preserving aspect ratio. */
function scaleToFit(natural: { width: number; height: number }, bounds: { width: number; height: number }) {
  const ratio = Math.min(bounds.width / natural.width, bounds.height / natural.height, 1);
  const scaled = { width: natural.width * ratio, height: natural.height * ratio };
  return {
    width: Math.max(120, scaled.width),
    height: Math.max(90, scaled.height + 28), // +28 for the node header
  };
}

export const useElementStore = create<ElementState>((set, get) => ({
  boardId: null,
  elements: {},
  connections: {},
  groups: {},
  grid: new SpatialGrid(512),
  loading: false,
  dragSnapshot: null,
  resizeSnapshot: null,

  loadBoard: async (boardId) => {
    set({ loading: true, boardId, elements: {}, connections: {}, groups: {}, grid: new SpatialGrid(512) });
    const [elements, connections, groups] = await Promise.all([
      storageService.getElementsForBoard(boardId),
      storageService.getConnectionsForBoard(boardId),
      storageService.getGroupsForBoard(boardId),
    ]);

    // If the user navigated to a DIFFERENT board while this one was still
    // loading (e.g. clicking two sidebar entries in quick succession), our
    // data has arrived too late — bail out instead of clobbering whatever
    // the newer loadBoard() call has since written. Without this guard, a
    // slow board load resolving after a fast subsequent one wins the race
    // and silently shows the wrong board's elements.
    if (get().boardId !== boardId) return;

    const grid = new SpatialGrid(512);
    const elementsMap: Record<string, AnyElement> = {};
    for (const el of elements) {
      elementsMap[el.id] = el;
      grid.upsert(el.id, { x: el.position.x, y: el.position.y, width: el.size.width, height: el.size.height });
    }
    const connectionsMap: Record<string, Connection> = {};
    for (const c of connections) connectionsMap[c.id] = c;
    const groupsMap: Record<string, Group> = {};
    for (const g of groups) groupsMap[g.id] = g;
    set({ elements: elementsMap, connections: connectionsMap, groups: groupsMap, grid, loading: false });
    useHistoryStore.getState().clear();
    syncBoardElementCount(boardId, elements.length);
  },

  /**
   * Load-testing utility for Fase 5 (performance/virtualization) — not
   * gated behind an env check because it's harmless and genuinely useful
   * for anyone verifying the DOM-culling behavior themselves, not just in
   * development. Bulk-writes directly (no per-element history entries —
   * pushing 10k+ undo commands would itself be the bottleneck, and
   * "undo the load test" isn't a meaningful operation anyway) and skips the
   * individual create-element code path so it stays fast at scale.
   */
  seedSyntheticElements: async (count) => {
    const { boardId } = get();
    if (!boardId) return;
    const now = Date.now();
    // Spread across a large area so panning/zooming around actually
    // exercises culling instead of everything sitting in one dense clump.
    const spread = Math.max(4000, Math.sqrt(count) * 260);
    const newElements: AnyElement[] = [];
    for (let i = 0; i < count; i += 1) {
      newElements.push({
        id: createId("el"),
        boardId,
        type: "note",
        position: {
          x: (Math.random() - 0.5) * spread,
          y: (Math.random() - 0.5) * spread,
        },
        size: { width: 200, height: 130 },
        rotation: 0,
        zIndex: i,
        locked: false,
        hidden: false,
        groupId: null,
        tags: [],
        createdAt: now,
        updatedAt: now,
        version: 1,
        data: { title: `Nó de teste #${i + 1}`, content: "" },
      } as AnyElement);
    }

    await storageService.elements.bulkPut(newElements);

    set((s) => {
      const nextElements = { ...s.elements };
      for (const el of newElements) {
        nextElements[el.id] = el;
        s.grid.upsert(el.id, {
          x: el.position.x,
          y: el.position.y,
          width: el.size.width,
          height: el.size.height,
        });
      }
      return { elements: nextElements };
    });

    syncBoardElementCount(boardId, Object.keys(get().elements).length);
  },

  createElement: (type, position) => {
    const { boardId } = get();
    if (!boardId) throw new Error("No board loaded");
    const now = Date.now();
    const size = DEFAULT_ELEMENT_SIZE[type];
    const element: AnyElement = {
      id: createId("el"),
      boardId,
      type,
      position,
      size: { ...size },
      rotation: 0,
      zIndex: Object.keys(get().elements).length,
      locked: false,
      hidden: false,
      groupId: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      data: createDefaultElementData(type),
    } as AnyElement;

    set((s) => {
      s.grid.upsert(element.id, {
        x: element.position.x,
        y: element.position.y,
        width: element.size.width,
        height: element.size.height,
      });
      return { elements: { ...s.elements, [element.id]: element } };
    });
    persistElement(element);

    useHistoryStore.getState().push({
      label: "Criar elemento",
      undo: () => {
        set((s) => {
          const next = { ...s.elements };
          delete next[element.id];
          s.grid.remove(element.id);
          return { elements: next };
        });
        void storageService.elements.delete(element.id);
      },
      redo: () => {
        set((s) => {
          s.grid.upsert(element.id, {
            x: element.position.x,
            y: element.position.y,
            width: element.size.width,
            height: element.size.height,
          });
          return { elements: { ...s.elements, [element.id]: element } };
        });
        persistElement(element);
      },
    });

    syncBoardElementCount(boardId, Object.keys(get().elements).length);
    return element;
  },

  createMediaElement: async (file, position) => {
    const { boardId } = get();
    if (!boardId) return null;
    const invalidReason = validateFile(file);
    if (invalidReason) {
      console.warn(invalidReason);
      return null;
    }

    const { elementType, assetKind } = classifyFile(file);
    const assetId = createId("asset");
    const dimensions = elementType === "image" ? await readImageDimensions(file) : null;

    await storageService.putAssetBlob(assetId, file);
    const now = Date.now();
    const asset: Asset = {
      id: assetId,
      kind: assetKind,
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      blobRef: assetId,
      width: dimensions?.width,
      height: dimensions?.height,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await storageService.assets.put(asset);

    // Bail if the user navigated to a different board while this file was
    // still being read/stored (real risk for large videos) — otherwise
    // we'd insert an element tagged with the OLD board's id into whatever
    // board's element map is currently loaded. The asset/blob we already
    // wrote stay orphaned in IndexedDB, same trade-off as a cancelled
    // element creation elsewhere; see docs/roadmap.md re: asset GC.
    if (get().boardId !== boardId) return null;

    const baseSize = DEFAULT_ELEMENT_SIZE[elementType];
    const size =
      elementType === "image" && dimensions
        ? scaleToFit(dimensions, baseSize)
        : baseSize;

    const data =
      elementType === "pdf"
        ? { assetId, fileName: file.name }
        : elementType === "file"
          ? { assetId, fileName: file.name, fileType: file.type, fileSize: file.size }
          : elementType === "image"
            ? { assetId, objectFit: "cover" as const }
            : { assetId };

    const element: AnyElement = {
      id: createId("el"),
      boardId,
      type: elementType,
      position,
      size: { ...size },
      rotation: 0,
      zIndex: Object.keys(get().elements).length,
      locked: false,
      hidden: false,
      groupId: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      data,
    } as AnyElement;

    set((s) => {
      s.grid.upsert(element.id, {
        x: element.position.x,
        y: element.position.y,
        width: element.size.width,
        height: element.size.height,
      });
      return { elements: { ...s.elements, [element.id]: element } };
    });
    persistElement(element);

    useHistoryStore.getState().push({
      label: "Adicionar mídia",
      undo: () => {
        set((s) => {
          const next = { ...s.elements };
          delete next[element.id];
          s.grid.remove(element.id);
          return { elements: next };
        });
        void storageService.elements.delete(element.id);
      },
      redo: () => {
        set((s) => {
          s.grid.upsert(element.id, {
            x: element.position.x,
            y: element.position.y,
            width: element.size.width,
            height: element.size.height,
          });
          return { elements: { ...s.elements, [element.id]: element } };
        });
        persistElement(element);
      },
    });

    syncBoardElementCount(boardId, Object.keys(get().elements).length);
    return element;
  },

  updateElementData: (id, patch) => {
    set((s) => {
      const el = s.elements[id];
      if (!el) return s;
      const updated = {
        ...el,
        data: { ...el.data, ...patch },
        updatedAt: Date.now(),
      } as AnyElement;
      persistElement(updated);
      return { elements: { ...s.elements, [id]: updated } };
    });
  },

  updateElementTags: (id, tags) => {
    set((s) => {
      const el = s.elements[id];
      if (!el) return s;
      const updated = { ...el, tags, updatedAt: Date.now() } as AnyElement;
      persistElement(updated);
      return { elements: { ...s.elements, [id]: updated } };
    });
  },

  beginMove: (ids) => {
    const snapshot: Record<string, Point> = {};
    for (const id of ids) {
      const el = get().elements[id];
      if (el) snapshot[id] = el.position;
    }
    set({ dragSnapshot: snapshot });
  },

  /** Applies a small incremental (per-pointermove) delta. No persistence, no history entry. */
  moveElements: (ids, dx, dy) => {
    set((s) => {
      const next = { ...s.elements };
      for (const id of ids) {
        const el = next[id];
        if (!el) continue;
        const moved: AnyElement = { ...el, position: { x: el.position.x + dx, y: el.position.y + dy } };
        next[id] = moved;
        s.grid.upsert(id, {
          x: moved.position.x,
          y: moved.position.y,
          width: moved.size.width,
          height: moved.size.height,
        });
      }
      return { elements: next };
    });
  },

  /** Persists final positions and records ONE history entry from drag-start to now. */
  commitMove: () => {
    const { dragSnapshot } = get();
    if (!dragSnapshot) return;
    const ids = Object.keys(dragSnapshot);
    const before = dragSnapshot;
    const after: Record<string, Point> = {};
    for (const id of ids) {
      const el = get().elements[id];
      if (!el) continue;
      after[id] = el.position;
      persistElement({ ...el, updatedAt: Date.now() });
    }
    set({ dragSnapshot: null });

    const moved = ids.some((id) => before[id] && after[id] && (before[id]!.x !== after[id]!.x || before[id]!.y !== after[id]!.y));
    if (!moved) return;

    const applyPositions = (positions: Record<string, Point>) => {
      set((s) => {
        const next = { ...s.elements };
        for (const id of ids) {
          const el = next[id];
          const pos = positions[id];
          if (!el || !pos) continue;
          const updated = { ...el, position: pos };
          next[id] = updated;
          s.grid.upsert(id, { x: pos.x, y: pos.y, width: el.size.width, height: el.size.height });
          persistElement(updated);
        }
        return { elements: next };
      });
    };

    useHistoryStore.getState().push({
      label: "Mover elementos",
      undo: () => applyPositions(before),
      redo: () => applyPositions(after),
    });
  },

  beginResize: (id) => {
    const el = get().elements[id];
    if (!el) return;
    set({ resizeSnapshot: { id, size: el.size, position: el.position } });
  },

  /** Live resize preview. No persistence, no history entry. */
  resizeElement: (id, size, position) => {
    set((s) => {
      const el = s.elements[id];
      if (!el) return s;
      const updated: AnyElement = { ...el, size, position };
      s.grid.upsert(id, { x: position.x, y: position.y, width: size.width, height: size.height });
      return { elements: { ...s.elements, [id]: updated } };
    });
  },

  commitResize: () => {
    const { resizeSnapshot } = get();
    if (!resizeSnapshot) return;
    const { id, size: beforeSize, position: beforePos } = resizeSnapshot;
    const el = get().elements[id];
    set({ resizeSnapshot: null });
    if (!el) return;
    const afterSize = el.size;
    const afterPos = el.position;
    if (afterSize.width === beforeSize.width && afterSize.height === beforeSize.height) return;
    persistElement({ ...el, updatedAt: Date.now() });

    const apply = (size: Size, position: Point) => {
      set((s) => {
        const current = s.elements[id];
        if (!current) return s;
        const updated = { ...current, size, position };
        s.grid.upsert(id, { x: position.x, y: position.y, width: size.width, height: size.height });
        persistElement(updated);
        return { elements: { ...s.elements, [id]: updated } };
      });
    };

    useHistoryStore.getState().push({
      label: "Redimensionar elemento",
      undo: () => apply(beforeSize, beforePos),
      redo: () => apply(afterSize, afterPos),
    });
  },

  deleteElements: (ids) => {
    const { boardId } = get();
    if (!boardId) return;
    const removed: AnyElement[] = ids.map((id) => get().elements[id]).filter(Boolean) as AnyElement[];
    const relatedConnections = Object.values(get().connections).filter(
      (c) => ids.includes(c.sourceId) || ids.includes(c.targetId),
    );

    // Any group that loses a member here needs to be shrunk (or dissolved,
    // if fewer than 2 members would remain) so it never keeps referencing a
    // deleted element — see the equivalent fix in groupElements.
    const affectedGroupSnapshots = new Map<string, Group>();
    for (const el of removed) {
      if (el.groupId && !affectedGroupSnapshots.has(el.groupId)) {
        const g = get().groups[el.groupId];
        if (g) affectedGroupSnapshots.set(el.groupId, g);
      }
    }
    const now = Date.now();

    set((s) => {
      const nextElements = { ...s.elements };
      for (const id of ids) {
        delete nextElements[id];
        s.grid.remove(id);
      }
      const nextConnections = { ...s.connections };
      for (const c of relatedConnections) delete nextConnections[c.id];

      const nextGroups = { ...s.groups };
      for (const [groupId, group] of affectedGroupSnapshots) {
        const remaining = group.elementIds.filter((id) => !ids.includes(id));
        if (remaining.length < 2) {
          delete nextGroups[groupId];
          void storageService.groups.delete(groupId);
          for (const remainingId of remaining) {
            const el = nextElements[remainingId];
            if (el) {
              nextElements[remainingId] = { ...el, groupId: null };
              persistElement(nextElements[remainingId]);
            }
          }
        } else {
          const shrunk = { ...group, elementIds: remaining, updatedAt: now };
          nextGroups[groupId] = shrunk;
          persistGroup(shrunk);
        }
      }

      return { elements: nextElements, connections: nextConnections, groups: nextGroups };
    });
    syncBoardElementCount(boardId, Object.keys(get().elements).length);

    for (const el of removed) {
      void storageService.elements.delete(el.id);
      void storageService.trash.put({
        id: createId("trash"),
        boardId,
        entityType: "element",
        entityId: el.id,
        snapshot: el,
        trashedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    }
    for (const c of relatedConnections) void storageService.connections.delete(c.id);

    useHistoryStore.getState().push({
      label: "Excluir elementos",
      undo: () => {
        set((s) => {
          const nextElements = { ...s.elements };
          for (const el of removed) {
            nextElements[el.id] = el;
            s.grid.upsert(el.id, {
              x: el.position.x,
              y: el.position.y,
              width: el.size.width,
              height: el.size.height,
            });
            persistElement(el);
          }
          const nextConnections = { ...s.connections };
          for (const c of relatedConnections) {
            nextConnections[c.id] = c;
            persistConnection(c);
          }
          const nextGroups = { ...s.groups };
          for (const [groupId, group] of affectedGroupSnapshots) {
            nextGroups[groupId] = group;
            persistGroup(group);
            // Elements that had their groupId cleared because the group
            // dissolved below 2 members need to point back at it too.
            for (const memberId of group.elementIds) {
              const el = nextElements[memberId];
              if (el && el.groupId !== groupId) {
                nextElements[memberId] = { ...el, groupId };
                persistElement(nextElements[memberId]);
              }
            }
          }
          return { elements: nextElements, connections: nextConnections, groups: nextGroups };
        });
        syncBoardElementCount(boardId, Object.keys(get().elements).length);
      },
      redo: () => {
        set((s) => {
          const nextElements = { ...s.elements };
          for (const el of removed) {
            delete nextElements[el.id];
            s.grid.remove(el.id);
            void storageService.elements.delete(el.id);
          }
          const nextConnections = { ...s.connections };
          for (const c of relatedConnections) {
            delete nextConnections[c.id];
            void storageService.connections.delete(c.id);
          }
          const nextGroups = { ...s.groups };
          for (const [groupId, group] of affectedGroupSnapshots) {
            const remaining = group.elementIds.filter((id) => !ids.includes(id));
            if (remaining.length < 2) {
              delete nextGroups[groupId];
              void storageService.groups.delete(groupId);
              for (const remainingId of remaining) {
                const el = nextElements[remainingId];
                if (el) {
                  nextElements[remainingId] = { ...el, groupId: null };
                  persistElement(nextElements[remainingId]);
                }
              }
            } else {
              const shrunk = { ...group, elementIds: remaining };
              nextGroups[groupId] = shrunk;
              persistGroup(shrunk);
            }
          }
          return { elements: nextElements, connections: nextConnections, groups: nextGroups };
        });
        syncBoardElementCount(boardId, Object.keys(get().elements).length);
      },
    });
  },

  createConnection: (sourceId, targetId) => {
    const { boardId } = get();
    if (!boardId || sourceId === targetId) return;
    const already = Object.values(get().connections).some(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId) ||
        (c.sourceId === targetId && c.targetId === sourceId),
    );
    if (already) return;

    const now = Date.now();
    const connection: Connection = {
      id: createId("conn"),
      boardId,
      sourceId,
      targetId,
      direction: "one-way",
      style: "solid",
      color: "signal",
      thickness: 2,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    set((s) => ({ connections: { ...s.connections, [connection.id]: connection } }));
    persistConnection(connection);

    useHistoryStore.getState().push({
      label: "Criar conexão",
      undo: () => {
        set((s) => {
          const next = { ...s.connections };
          delete next[connection.id];
          return { connections: next };
        });
        void storageService.connections.delete(connection.id);
      },
      redo: () => {
        set((s) => ({ connections: { ...s.connections, [connection.id]: connection } }));
        persistConnection(connection);
      },
    });
  },

  deleteConnections: (ids) => {
    const removed = ids.map((id) => get().connections[id]).filter(Boolean) as Connection[];
    set((s) => {
      const next = { ...s.connections };
      for (const id of ids) delete next[id];
      return { connections: next };
    });
    for (const c of removed) void storageService.connections.delete(c.id);

    useHistoryStore.getState().push({
      label: "Excluir conexão",
      undo: () => {
        set((s) => {
          const next = { ...s.connections };
          for (const c of removed) {
            next[c.id] = c;
            persistConnection(c);
          }
          return { connections: next };
        });
      },
      redo: () => {
        set((s) => {
          const next = { ...s.connections };
          for (const c of removed) {
            delete next[c.id];
            void storageService.connections.delete(c.id);
          }
          return { connections: next };
        });
      },
    });
  },

  groupMembers: (elementId) => {
    const el = get().elements[elementId];
    if (!el?.groupId) return [elementId];
    const group = get().groups[el.groupId];
    return group ? group.elementIds : [elementId];
  },

  groupElements: (ids) => {
    const { boardId } = get();
    if (!boardId || ids.length < 2) return;
    const now = Date.now();
    const group: Group = {
      id: createId("group"),
      boardId,
      elementIds: ids,
      collapsed: false,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    const previousGroupIds: Record<string, string | null> = {};
    // Snapshot every OLD group these elements might already belong to, so we
    // can both clean them up now and restore them precisely on undo. Without
    // this, regrouping already-grouped elements leaves orphaned Group
    // records in IndexedDB that still list elements now owned by a new group.
    const staleGroupSnapshots = new Map<string, Group>();
    for (const id of ids) {
      const el = get().elements[id];
      if (el?.groupId && !staleGroupSnapshots.has(el.groupId)) {
        const g = get().groups[el.groupId];
        if (g) staleGroupSnapshots.set(el.groupId, g);
      }
    }

    set((s) => {
      const next = { ...s.elements };
      for (const id of ids) {
        const el = next[id];
        if (!el) continue;
        previousGroupIds[id] = el.groupId;
        next[id] = { ...el, groupId: group.id };
        persistElement(next[id]);
      }
      // Shrink or dissolve every stale old group so it never references an
      // element that now belongs to the new group.
      const groups = { ...s.groups, [group.id]: group };
      for (const [oldGroupId, oldGroup] of staleGroupSnapshots) {
        const remaining = oldGroup.elementIds.filter((id) => !ids.includes(id));
        if (remaining.length < 2) {
          delete groups[oldGroupId];
          void storageService.groups.delete(oldGroupId);
          for (const remainingId of remaining) {
            const el = next[remainingId];
            if (el) {
              next[remainingId] = { ...el, groupId: null };
              persistElement(next[remainingId]);
            }
          }
        } else {
          const shrunk = { ...oldGroup, elementIds: remaining, updatedAt: now };
          groups[oldGroupId] = shrunk;
          persistGroup(shrunk);
        }
      }
      return { elements: next, groups };
    });
    persistGroup(group);

    useHistoryStore.getState().push({
      label: "Agrupar elementos",
      undo: () => {
        set((s) => {
          const next = { ...s.elements };
          for (const id of ids) {
            const el = next[id];
            if (!el) continue;
            next[id] = { ...el, groupId: previousGroupIds[id] ?? null };
            persistElement(next[id]);
          }
          const groups = { ...s.groups };
          delete groups[group.id];
          // Restore every old group exactly as it was before this regroup.
          for (const [oldGroupId, oldGroup] of staleGroupSnapshots) {
            groups[oldGroupId] = oldGroup;
            persistGroup(oldGroup);
          }
          return { elements: next, groups };
        });
        void storageService.groups.delete(group.id);
      },
      redo: () => {
        set((s) => {
          const next = { ...s.elements };
          for (const id of ids) {
            const el = next[id];
            if (!el) continue;
            next[id] = { ...el, groupId: group.id };
            persistElement(next[id]);
          }
          const groups = { ...s.groups, [group.id]: group };
          for (const [oldGroupId, oldGroup] of staleGroupSnapshots) {
            const remaining = oldGroup.elementIds.filter((id) => !ids.includes(id));
            if (remaining.length < 2) {
              delete groups[oldGroupId];
              void storageService.groups.delete(oldGroupId);
            } else {
              const shrunk = { ...oldGroup, elementIds: remaining };
              groups[oldGroupId] = shrunk;
              persistGroup(shrunk);
            }
          }
          return { elements: next, groups };
        });
        persistGroup(group);
      },
    });
  },

  ungroupElements: (ids) => {
    const groupIds = new Set(
      ids.map((id) => get().elements[id]?.groupId).filter((id): id is string => Boolean(id)),
    );
    if (groupIds.size === 0) return;
    const affectedGroups = Array.from(groupIds)
      .map((id) => get().groups[id])
      .filter((g): g is Group => Boolean(g));

    set((s) => {
      const next = { ...s.elements };
      for (const group of affectedGroups) {
        for (const id of group.elementIds) {
          const el = next[id];
          if (el) {
            next[id] = { ...el, groupId: null };
            persistElement(next[id]);
          }
        }
      }
      const groups = { ...s.groups };
      for (const group of affectedGroups) delete groups[group.id];
      return { elements: next, groups };
    });
    for (const group of affectedGroups) void storageService.groups.delete(group.id);

    useHistoryStore.getState().push({
      label: "Desagrupar elementos",
      undo: () => {
        set((s) => {
          const next = { ...s.elements };
          for (const group of affectedGroups) {
            for (const id of group.elementIds) {
              const el = next[id];
              if (el) {
                next[id] = { ...el, groupId: group.id };
                persistElement(next[id]);
              }
            }
          }
          const groups = { ...s.groups };
          for (const group of affectedGroups) groups[group.id] = group;
          return { elements: next, groups };
        });
        for (const group of affectedGroups) persistGroup(group);
      },
      redo: () => {
        set((s) => {
          const next = { ...s.elements };
          for (const group of affectedGroups) {
            for (const id of group.elementIds) {
              const el = next[id];
              if (el) {
                next[id] = { ...el, groupId: null };
                persistElement(next[id]);
              }
            }
          }
          const groups = { ...s.groups };
          for (const group of affectedGroups) delete groups[group.id];
          return { elements: next, groups };
        });
        for (const group of affectedGroups) void storageService.groups.delete(group.id);
      },
    });
  },

  duplicateElements: (ids) => {
    const { boardId } = get();
    if (!boardId || ids.length === 0) return [];
    const now = Date.now();
    const duplicates: AnyElement[] = [];

    for (const id of ids) {
      const el = get().elements[id];
      if (!el) continue;
      duplicates.push({
        ...el,
        id: createId("el"),
        // Offset so the copy is visibly distinct from the original instead
        // of sitting exactly on top of it.
        position: { x: el.position.x + 24, y: el.position.y + 24 },
        // A duplicate is deliberately NOT part of the original's group —
        // grouping is an explicit user action (§17), not something a copy
        // should silently inherit.
        groupId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (duplicates.length === 0) return [];

    set((s) => {
      const next = { ...s.elements };
      for (const el of duplicates) {
        next[el.id] = el;
        s.grid.upsert(el.id, { x: el.position.x, y: el.position.y, width: el.size.width, height: el.size.height });
      }
      return { elements: next };
    });
    for (const el of duplicates) persistElement(el);
    syncBoardElementCount(boardId, Object.keys(get().elements).length);

    useHistoryStore.getState().push({
      label: "Duplicar elementos",
      undo: () => {
        set((s) => {
          const next = { ...s.elements };
          for (const el of duplicates) {
            delete next[el.id];
            s.grid.remove(el.id);
          }
          return { elements: next };
        });
        for (const el of duplicates) void storageService.elements.delete(el.id);
      },
      redo: () => {
        set((s) => {
          const next = { ...s.elements };
          for (const el of duplicates) {
            next[el.id] = el;
            s.grid.upsert(el.id, { x: el.position.x, y: el.position.y, width: el.size.width, height: el.size.height });
          }
          return { elements: next };
        });
        for (const el of duplicates) persistElement(el);
      },
    });

    return duplicates.map((el) => el.id);
  },

  reset: () =>
    set({
      boardId: null,
      elements: {},
      connections: {},
      groups: {},
      grid: new SpatialGrid(512),
      dragSnapshot: null,
      resizeSnapshot: null,
    }),
}));

export type { Command };
