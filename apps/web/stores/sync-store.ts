import { create } from "zustand";
import type { PresenceState } from "../lib/supabase/sync";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface SyncState {
  status: SyncStatus;
  boardId: string | null;
  isShared: boolean;
  remoteUsers: Map<string, PresenceState>;
  lastSyncedAt: number | null;

  setStatus: (status: SyncStatus) => void;
  setBoardId: (boardId: string | null) => void;
  setIsShared: (isShared: boolean) => void;
  setRemoteUsers: (users: Map<string, PresenceState>) => void;
  setLastSyncedAt: (at: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  boardId: null,
  isShared: false,
  remoteUsers: new Map(),
  lastSyncedAt: null,

  setStatus: (status) => set({ status }),
  setBoardId: (boardId) => set({ boardId }),
  setIsShared: (isShared) => set({ isShared }),
  setRemoteUsers: (remoteUsers) => set({ remoteUsers }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));
