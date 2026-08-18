import type { BaseEntity } from "./base";

/**
 * A Workspace is the top-level container — analogous to a "project".
 * It owns one or more Boards. There is always at least one workspace
 * (created automatically on first launch, see onboarding flow).
 */
export interface Workspace extends BaseEntity {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  boardIds: string[];
  isDefault: boolean;
}

export interface CanvasViewport {
  /** World-space X offset of the viewport's top-left corner. */
  x: number;
  /** World-space Y offset of the viewport's top-left corner. */
  y: number;
  /** Zoom factor. 1 = 100%. Clamped by the canvas engine (e.g. 0.05–4). */
  zoom: number;
}

export interface BoardSettings {
  gridEnabled: boolean;
  gridSize: number;
  snapEnabled: boolean;
  snapThreshold: number;
  background: "dot-grid" | "line-grid" | "solid";
}

/**
 * A Board is a single infinite canvas. A Workspace can contain many boards
 * (e.g. "Research", "Product Roadmap", "Reading List").
 */
export interface Board extends BaseEntity {
  workspaceId: string;
  name: string;
  icon?: string;
  isFavorite: boolean;
  isTrashed: boolean;
  trashedAt?: number;
  lastOpenedAt: number;
  viewport: CanvasViewport;
  settings: BoardSettings;
  elementCount: number;
}

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  gridEnabled: true,
  gridSize: 24,
  snapEnabled: true,
  snapThreshold: 6,
  background: "dot-grid",
};

export const DEFAULT_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };
