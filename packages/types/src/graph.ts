import type { BaseEntity, ColorValue } from "./base";

export type ConnectionDirection = "one-way" | "two-way" | "none";
export type ConnectionStyle = "solid" | "dashed" | "dotted";

/** An edge connecting two elements on the same board. */
export interface Connection extends BaseEntity {
  boardId: string;
  sourceId: string;
  targetId: string;
  label?: string;
  direction: ConnectionDirection;
  style: ConnectionStyle;
  color: ColorValue;
  thickness: number;
}

/** A saved cluster of element ids that can be moved/selected as one unit. */
export interface Group extends BaseEntity {
  boardId: string;
  elementIds: string[];
  name?: string;
  collapsed: boolean;
}

export type AssetKind = "image" | "video" | "audio" | "pdf" | "file";

/**
 * Binary payloads (images, videos, PDFs, ...) are stored separately from
 * their referencing element so large blobs don't bloat the element store
 * and can be garbage-collected independently (see storage layer).
 */
export interface Asset extends BaseEntity {
  kind: AssetKind;
  fileName: string;
  mimeType: string;
  byteSize: number;
  /** Blob is stored in the `assetBlobs` IndexedDB store, keyed by this id. */
  blobRef: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface TrashItem extends BaseEntity {
  boardId: string;
  entityType: "element" | "connection" | "group";
  entityId: string;
  /** Serialized snapshot of the entity at the moment of deletion, for restore. */
  snapshot: unknown;
  trashedAt: number;
}

export type HistoryOperationType =
  | "create-element"
  | "update-element"
  | "delete-element"
  | "move-elements"
  | "resize-element"
  | "create-connection"
  | "delete-connection"
  | "group-elements"
  | "ungroup-elements";

/** A single, invertible entry in the undo/redo stack. See docs/state-management.md. */
export interface HistoryEntry {
  id: string;
  boardId: string;
  type: HistoryOperationType;
  timestamp: number;
  /** Opaque payload interpreted by the matching Command (do/undo). */
  before: unknown;
  after: unknown;
}

export type ThemeMode = "dark" | "light" | "system";

export interface AppSettings extends BaseEntity {
  theme: ThemeMode;
  reducedMotion: boolean;
  gridDefault: boolean;
  autoSaveIntervalMs: number;
  shortcutsOverrides: Record<string, string>;
}
