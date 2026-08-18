import { create } from "zustand";
import type { ThemeMode } from "@nexus/types";
import { storageService } from "@nexus/storage";

export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error";
export type CanvasTool =
  | "select"
  | "pan"
  | "note"
  | "text"
  | "task"
  | "checklist"
  | "list"
  | "link"
  | "bookmark"
  | "code"
  | "location"
  | "connect";

interface UiState {
  theme: ThemeMode;
  resolvedTheme: "dark" | "light";
  sidebarCollapsed: boolean;
  activeTool: CanvasTool;
  commandPaletteOpen: boolean;
  saveStatus: SaveStatus;
  propertyPanelOpen: boolean;
  pendingFocusElementId: string | null;

  setTheme: (theme: ThemeMode) => Promise<void>;
  hydrateTheme: () => Promise<void>;
  toggleSidebar: () => void;
  setActiveTool: (tool: CanvasTool) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setPropertyPanelOpen: (open: boolean) => void;
  setPendingFocusElementId: (id: string | null) => void;
}

function resolveTheme(theme: ThemeMode): "dark" | "light" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: "dark" | "light") {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("nexus-theme-cache", theme);
}

export const useUiStore = create<UiState>((set) => ({
  theme: "dark",
  resolvedTheme: "dark",
  sidebarCollapsed: false,
  activeTool: "select",
  commandPaletteOpen: false,
  saveStatus: "idle",
  propertyPanelOpen: false,
  pendingFocusElementId: null,

  hydrateTheme: async () => {
    const settings = await storageService.getSettings();
    const resolved = resolveTheme(settings.theme);
    applyTheme(resolved);
    set({ theme: settings.theme, resolvedTheme: resolved });
  },

  setTheme: async (theme) => {
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
    const settings = await storageService.getSettings();
    await storageService.saveSettings({ ...settings, theme });
  },

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setPropertyPanelOpen: (open) => set({ propertyPanelOpen: open }),
  setPendingFocusElementId: (id) => set({ pendingFocusElementId: id }),
}));
