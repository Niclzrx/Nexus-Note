import { create } from "zustand";
import type { PresenceState } from "../lib/supabase/sync";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";
export type BoardRole = "owner" | "editor" | "viewer" | null;

interface SyncState {
  status: SyncStatus;
  boardId: string | null;
  isShared: boolean;
  role: BoardRole;
  remoteUsers: Map<string, PresenceState>;
  lastSyncedAt: number | null;

  setStatus: (status: SyncStatus) => void;
  setBoardId: (boardId: string | null) => void;
  setIsShared: (isShared: boolean) => void;
  setRole: (role: BoardRole) => void;
  setRemoteUsers: (users: Map<string, PresenceState>) => void;
  setLastSyncedAt: (at: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  boardId: null,
  isShared: false,
  role: null,
  remoteUsers: new Map(),
  lastSyncedAt: null,

  setStatus: (status) => set({ status }),
  setBoardId: (boardId) => set({ boardId }),
  setIsShared: (isShared) => set({ isShared }),
  setRole: (role) => set({ role }),
  setRemoteUsers: (remoteUsers) => set({ remoteUsers }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));
