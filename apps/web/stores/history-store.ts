import { create } from "zustand";

export interface Command {
  label: string;
  undo: () => void;
  redo: () => void;
}

interface HistoryState {
  past: Command[];
  future: Command[];
  /** Records an already-applied command (its `redo` is not called here). */
  push: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 200;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  push: (command) =>
    set((s) => ({
      past: [...s.past.slice(-MAX_HISTORY + 1), command],
      future: [],
    })),

  undo: () => {
    const { past, future } = get();
    const command = past[past.length - 1];
    if (!command) return;
    command.undo();
    set({ past: past.slice(0, -1), future: [...future, command] });
  },

  redo: () => {
    const { past, future } = get();
    const command = future[future.length - 1];
    if (!command) return;
    command.redo();
    set({ past: [...past, command], future: future.slice(0, -1) });
  },

  clear: () => set({ past: [], future: [] }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
