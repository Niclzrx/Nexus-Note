import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AnyElement, Connection, Group } from "@nexus/types";
import { storageService } from "@nexus/storage";
import {
  subscribeToBoardChanges,
  pullBoardContent,
  pushBoardContent,
  type ChangePayload,
} from "../lib/supabase/sync";
import { useElementStore } from "../stores/element-store";
import { useSyncStore } from "../stores/sync-store";

/**
 * Subscribes to Supabase Realtime changes for a board. When a remote change
 * arrives, it applies it to the local element store (last-write-wins by
 * updated_at timestamp).
 *
 * Also handles initial pull: on mount, fetches remote content and merges it
 * into local IndexedDB + Zustand state.
 */
export function useRealtime(boardId: string, isShared: boolean) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const setStatus = useSyncStore((s) => s.setStatus);
  const setLastSyncedAt = useSyncStore((s) => s.setLastSyncedAt);

  useEffect(() => {
    if (!isShared || !boardId) return;

    let cancelled = false;

    async function init() {
      setStatus("syncing");

      // Pull remote content first, then subscribe to live changes
      const remote = await pullBoardContent(boardId);
      if (cancelled) return;

      // Merge remote into local (last-write-wins)
      const localElements = useElementStore.getState().elements;
      const localConnections = useElementStore.getState().connections;
      const localGroups = useElementStore.getState().groups;

      const mergedElements = mergeItems(localElements, remote.elements);
      const mergedConnections = mergeItems(localConnections, remote.connections);
      const mergedGroups = mergeItems(localGroups, remote.groups);

      // Apply merged state to local store and IndexedDB
      const state = useElementStore.getState();
      for (const el of Object.values(mergedElements)) {
        const local = localElements[el.id];
        if (!local || el.updatedAt > local.updatedAt) {
          // Remote is newer — update local
          useElementStore.setState((s) => ({
            elements: { ...s.elements, [el.id]: el },
          }));
          await storageService.elements.put(el);
        }
      }
      for (const conn of Object.values(mergedConnections)) {
        const local = localConnections[conn.id];
        if (!local || conn.updatedAt > local.updatedAt) {
          useElementStore.setState((s) => ({
            connections: { ...s.connections, [conn.id]: conn },
          }));
          await storageService.connections.put(conn);
        }
      }
      for (const group of Object.values(mergedGroups)) {
        const local = localGroups[group.id];
        if (!local || group.updatedAt > local.updatedAt) {
          useElementStore.setState((s) => ({
            groups: { ...s.groups, [group.id]: group },
          }));
          await storageService.groups.put(group);
        }
      }

      setLastSyncedAt(Date.now());
      setStatus("synced");

      // Push local content that doesn't exist in Supabase yet
      // (handles the case where the owner created content before isShared was true)
      const finalElements = Object.values(useElementStore.getState().elements);
      const finalConnections = Object.values(useElementStore.getState().connections);
      const finalGroups = Object.values(useElementStore.getState().groups);
      if (finalElements.length > 0 || finalConnections.length > 0 || finalGroups.length > 0) {
        void pushBoardContent(boardId, {
          elements: finalElements,
          connections: finalConnections,
          groups: finalGroups,
        }).catch((err) => console.error("useRealtime: initial push failed:", err));
      }

      // Subscribe to live changes
      channelRef.current = subscribeToBoardChanges(boardId, (payload) => {
        if (cancelled) return;
        handleRemoteChange(payload);
      });
    }

    init();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [boardId, isShared, setStatus, setLastSyncedAt]);
}

/**
 * Apply a single remote change to the local store. Uses last-write-wins
 * by comparing updated_at timestamps.
 */
function handleRemoteChange(payload: ChangePayload) {
  const { eventType, new: newRow, old: oldRow } = payload;
  const now = Date.now();

  if (eventType === "DELETE" && oldRow) {
    // Remote deleted an item
    switch (oldRow.content_type) {
      case "element":
        useElementStore.setState((s) => {
          const next = { ...s.elements };
          delete next[oldRow.content_id];
          return { elements: next };
        });
        void storageService.elements.delete(oldRow.content_id);
        break;
      case "connection":
        useElementStore.setState((s) => {
          const next = { ...s.connections };
          delete next[oldRow.content_id];
          return { connections: next };
        });
        void storageService.connections.delete(oldRow.content_id);
        break;
      case "group":
        useElementStore.setState((s) => {
          const next = { ...s.groups };
          delete next[oldRow.content_id];
          return { groups: next };
        });
        void storageService.groups.delete(oldRow.content_id);
        break;
    }
    return;
  }

  if (!newRow) return;

  const remoteUpdatedAt = new Date(newRow.updated_at).getTime();

  switch (newRow.content_type) {
    case "element": {
      const remote = newRow.data as unknown as AnyElement;
      const local = useElementStore.getState().elements[remote.id];
      if (!local || remoteUpdatedAt > local.updatedAt) {
        useElementStore.setState((s) => ({
          elements: { ...s.elements, [remote.id]: remote },
        }));
        void storageService.elements.put(remote);
      }
      break;
    }
    case "connection": {
      const remote = newRow.data as unknown as Connection;
      const local = useElementStore.getState().connections[remote.id];
      if (!local || remoteUpdatedAt > local.updatedAt) {
        useElementStore.setState((s) => ({
          connections: { ...s.connections, [remote.id]: remote },
        }));
        void storageService.connections.put(remote);
      }
      break;
    }
    case "group": {
      const remote = newRow.data as unknown as Group;
      const local = useElementStore.getState().groups[remote.id];
      if (!local || remoteUpdatedAt > local.updatedAt) {
        useElementStore.setState((s) => ({
          groups: { ...s.groups, [remote.id]: remote },
        }));
        void storageService.groups.put(remote);
      }
      break;
    }
  }

  useSyncStore.getState().setLastSyncedAt(now);
}

/**
 * Merge remote items into local. Remote wins when timestamps are newer.
 */
function mergeItems<T extends { id: string; updatedAt: number }>(
  local: Record<string, T>,
  remote: T[],
): Record<string, T> {
  const result = { ...local };
  for (const item of remote) {
    const existing = result[item.id];
    if (!existing || item.updatedAt > existing.updatedAt) {
      result[item.id] = item;
    }
  }
  return result;
}
