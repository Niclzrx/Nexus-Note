import { useEffect, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  trackPresence,
  updatePresenceCursor,
  getPresenceStates,
  untrackPresence,
  getUserColor,
  type PresenceState,
} from "../lib/supabase/sync";
import { useSyncStore } from "../stores/sync-store";

/**
 * Tracks the current user's cursor position and subscribes to other users'
 * presence on a shared board. Returns the current remote users' states.
 */
export function usePresence(boardId: string, userId: string, username: string, isShared: boolean) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const setRemoteUsers = useSyncStore((s) => s.setRemoteUsers);
  const myColor = getUserColor(userId);
  const lastUpdate = useRef(0);

  // Broadcast cursor position (throttled to ~20fps = 50ms)
  const broadcastCursor = useCallback(
    (worldX: number, worldY: number) => {
      const now = Date.now();
      if (now - lastUpdate.current < 50) return;
      lastUpdate.current = now;

      if (channelRef.current) {
        updatePresenceCursor(channelRef.current, worldX, worldY, myColor);
      }
    },
    [myColor],
  );

  useEffect(() => {
    if (!isShared || !boardId || !userId) return;

    let cancelled = false;

    channelRef.current = trackPresence(boardId, userId, username);

    // Poll presence state every 2 seconds to pick up new/removed users
    const interval = setInterval(() => {
      if (cancelled || !channelRef.current) return;
      const users = getPresenceStates(channelRef.current);
      // Remove self from remote users
      users.delete(userId);
      setRemoteUsers(users);
    }, 2000);

    // Listen for presence changes
    channelRef.current.on("presence", { event: "sync" }, () => {
      if (cancelled || !channelRef.current) return;
      const users = getPresenceStates(channelRef.current);
      users.delete(userId);
      setRemoteUsers(users);
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channelRef.current) {
        void untrackPresence(channelRef.current, boardId, userId);
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setRemoteUsers(new Map());
    };
  }, [boardId, userId, username, isShared, setRemoteUsers]);

  return { broadcastCursor, myColor };
}
