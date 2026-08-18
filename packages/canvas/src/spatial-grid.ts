import type { Bounds } from "@nexus/types";
import { boundsIntersect } from "./coordinates";

/**
 * Uniform-grid spatial index.
 *
 * Instead of testing all N elements against the viewport every frame
 * (O(N)), elements are bucketed into fixed-size world-space cells on
 * insert/update. A viewport query only visits the handful of cells the
 * viewport actually overlaps, then does a precise bounds check on just
 * those candidates — this is what makes 100k+ element boards tractable
 * (see docs/performance.md, spec §11).
 */
export class SpatialGrid<Id extends string = string> {
  private readonly cellSize: number;
  private readonly cells = new Map<string, Set<Id>>();
  private readonly idToBounds = new Map<Id, Bounds>();
  private readonly idToCells = new Map<Id, string[]>();

  constructor(cellSize = 512) {
    this.cellSize = cellSize;
  }

  private cellKeysForBounds(bounds: Bounds): string[] {
    const minCx = Math.floor(bounds.x / this.cellSize);
    const minCy = Math.floor(bounds.y / this.cellSize);
    const maxCx = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const maxCy = Math.floor((bounds.y + bounds.height) / this.cellSize);
    const keys: string[] = [];
    for (let cx = minCx; cx <= maxCx; cx += 1) {
      for (let cy = minCy; cy <= maxCy; cy += 1) {
        keys.push(`${cx}:${cy}`);
      }
    }
    return keys;
  }

  upsert(id: Id, bounds: Bounds): void {
    this.remove(id);
    const keys = this.cellKeysForBounds(bounds);
    for (const key of keys) {
      let set = this.cells.get(key);
      if (!set) {
        set = new Set();
        this.cells.set(key, set);
      }
      set.add(id);
    }
    this.idToCells.set(id, keys);
    this.idToBounds.set(id, bounds);
  }

  remove(id: Id): void {
    const keys = this.idToCells.get(id);
    if (!keys) return;
    for (const key of keys) {
      const set = this.cells.get(key);
      set?.delete(id);
      if (set && set.size === 0) this.cells.delete(key);
    }
    this.idToCells.delete(id);
    this.idToBounds.delete(id);
  }

  clear(): void {
    this.cells.clear();
    this.idToBounds.clear();
    this.idToCells.clear();
  }

  /** Returns ids whose bounds precisely intersect `queryBounds`. */
  query(queryBounds: Bounds): Id[] {
    const keys = this.cellKeysForBounds(queryBounds);
    const candidates = new Set<Id>();
    for (const key of keys) {
      const set = this.cells.get(key);
      if (!set) continue;
      for (const id of set) candidates.add(id);
    }
    const result: Id[] = [];
    for (const id of candidates) {
      const bounds = this.idToBounds.get(id);
      if (bounds && boundsIntersect(bounds, queryBounds)) result.push(id);
    }
    return result;
  }

  get size(): number {
    return this.idToBounds.size;
  }
}
