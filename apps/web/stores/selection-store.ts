import { create } from "zustand";

interface SelectionState {
  elementIds: Set<string>;
  connectionIds: Set<string>;

  selectOnly: (id: string) => void;
  toggle: (id: string) => void;
  selectMany: (ids: string[], additive: boolean) => void;
  selectConnection: (id: string, additive: boolean) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  elementIds: new Set(),
  connectionIds: new Set(),

  selectOnly: (id) => set({ elementIds: new Set([id]), connectionIds: new Set() }),

  toggle: (id) =>
    set((s) => {
      const next = new Set(s.elementIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { elementIds: next };
    }),

  selectMany: (ids, additive) =>
    set((s) => ({
      elementIds: additive ? new Set([...s.elementIds, ...ids]) : new Set(ids),
      connectionIds: additive ? s.connectionIds : new Set(),
    })),

  selectConnection: (id, additive) =>
    set((s) => ({
      connectionIds: additive ? new Set([...s.connectionIds, id]) : new Set([id]),
      elementIds: additive ? s.elementIds : new Set(),
    })),

  clear: () => set({ elementIds: new Set(), connectionIds: new Set() }),
  isSelected: (id) => get().elementIds.has(id),
}));
