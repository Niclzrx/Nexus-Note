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
  // Distinct from `sidebarCollapsed` (desktop's icon-only 56px mode): on
  // mobile the sidebar is a full overlay drawer, closed by default, opened
  // via a menu button. Kept as separate state rather than overloading
  // `sidebarCollapsed` because the two mean different things ("narrow but
  // visible" vs. "off-screen entirely") and a screen-size change shouldn't
  // silently flip the other one's meaning.
  mobileSidebarOpen: boolean;
  activeTool: CanvasTool;
  commandPaletteOpen: boolean;
  saveStatus: SaveStatus;
  propertyPanelOpen: boolean;
  pendingFocusElementId: string | null;

  setTheme: (theme: ThemeMode) => Promise<void>;
  hydrateTheme: () => Promise<void>;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
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
  mobileSidebarOpen: false,
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
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setPropertyPanelOpen: (open) => set({ propertyPanelOpen: open }),
  setPendingFocusElementId: (id) => set({ pendingFocusElementId: id }),
}));
