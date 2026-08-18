/**
 * Base fields shared by every persisted entity in Nexus Note.
 *
 * `version` is the entity schema version, used by the storage layer to run
 * migrations when the shape of an entity changes between releases.
 */
export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

/** A point in "world" (canvas) coordinate space, independent of zoom/pan. */
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Point, Size {}

/** RGBA-safe color token — either a design-system token name or a raw hex. */
export type ColorValue = string;
