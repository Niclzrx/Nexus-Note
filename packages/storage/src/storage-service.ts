import type {
  AnyElement,
  AppSettings,
  Asset,
  Board,
  Connection,
  Group,
  HistoryEntry,
  TrashItem,
  Workspace,
} from "@nexus/types";
import { DEFAULT_BOARD_SETTINGS, DEFAULT_VIEWPORT } from "@nexus/types";
import { STORE, reqToPromise, withTransaction } from "./db";
import { Repository } from "./repository";
import { createId } from "./id";
import { extractSearchableText } from "./search";

/**
 * StorageService is the single entry point the rest of the app uses to
 * persist and load data. UI and Zustand stores call this — never IndexedDB
 * directly (see docs/storage.md and §8/§48 of the product spec).
 */
export class StorageService {
  readonly workspaces = new Repository<Workspace>(STORE.workspaces);
  readonly boards = new Repository<Board>(STORE.boards);
  readonly elements = new Repository<AnyElement>(STORE.elements);
  readonly connections = new Repository<Connection>(STORE.connections);
  readonly groups = new Repository<Group>(STORE.groups);
  readonly assets = new Repository<Asset>(STORE.assets);
  readonly trash = new Repository<TrashItem>(STORE.trash);
  readonly history = new Repository<HistoryEntry>(STORE.history);

  // ---- Board-scoped reads --------------------------------------------

  getElementsForBoard(boardId: string): Promise<AnyElement[]> {
    return this.elements.getAllByIndex("byBoard", boardId);
  }

  /**
   * Searches element titles/content/tags across every board in the workspace.
   * Runs entirely in-memory over `elements.getAll()` — fine at the scale a
   * single local user reaches; if that changes, this is the seam to swap in
   * a proper inverted index without touching callers (see docs/storage.md).
   */
  async searchElements(
    query: string,
    limit = 20,
  ): Promise<{ element: AnyElement; boardName: string; snippet: string }[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const [elements, boards] = await Promise.all([this.elements.getAll(), this.boards.getAll()]);
    const boardNameById = new Map(boards.map((b) => [b.id, b.name]));

    const results: { element: AnyElement; boardName: string; snippet: string }[] = [];
    for (const element of elements) {
      const { text, snippet } = extractSearchableText(element);
      if (!text.includes(trimmed) && !element.tags.some((t) => t.toLowerCase().includes(trimmed))) {
        continue;
      }
      results.push({
        element,
        boardName: boardNameById.get(element.boardId) ?? "Board",
        snippet,
      });
      if (results.length >= limit) break;
    }
    return results;
  }

  getConnectionsForBoard(boardId: string): Promise<Connection[]> {
    return this.connections.getAllByIndex("byBoard", boardId);
  }

  getGroupsForBoard(boardId: string): Promise<Group[]> {
    return this.groups.getAllByIndex("byBoard", boardId);
  }

  getBoardsForWorkspace(workspaceId: string): Promise<Board[]> {
    return this.boards.getAllByIndex("byWorkspace", workspaceId);
  }

  // ---- Asset blobs (stored separately from Asset metadata) -----------

  async putAssetBlob(id: string, blob: Blob): Promise<void> {
    await withTransaction([STORE.assetBlobs], "readwrite", (tx) =>
      reqToPromise(tx.objectStore(STORE.assetBlobs).put({ id, blob })),
    );
  }

  async getAssetBlob(id: string): Promise<Blob | undefined> {
    const record = await withTransaction([STORE.assetBlobs], "readonly", (tx) =>
      reqToPromise(
        tx.objectStore(STORE.assetBlobs).get(id) as IDBRequest<
          { id: string; blob: Blob } | undefined
        >,
      ),
    );
    return record?.blob;
  }

  async deleteAssetBlob(id: string): Promise<void> {
    await withTransaction([STORE.assetBlobs], "readwrite", (tx) =>
      reqToPromise(tx.objectStore(STORE.assetBlobs).delete(id)),
    );
  }

  // ---- Settings (singleton row) ---------------------------------------

  private static SETTINGS_ID = "app-settings";

  async getSettings(): Promise<AppSettings> {
    const existing = await withTransaction([STORE.settings], "readonly", (tx) =>
      reqToPromise(
        tx.objectStore(STORE.settings).get(StorageService.SETTINGS_ID) as IDBRequest<
          AppSettings | undefined
        >,
      ),
    );
    if (existing) return existing;
    const now = Date.now();
    const defaults: AppSettings = {
      id: StorageService.SETTINGS_ID,
      createdAt: now,
      updatedAt: now,
      version: 1,
      theme: "dark",
      reducedMotion: false,
      gridDefault: true,
      autoSaveIntervalMs: 800,
      shortcutsOverrides: {},
    };
    await this.saveSettings(defaults);
    return defaults;
  }

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const updated: AppSettings = { ...settings, updatedAt: Date.now() };
    await withTransaction([STORE.settings], "readwrite", (tx) =>
      reqToPromise(tx.objectStore(STORE.settings).put(updated)),
    );
    return updated;
  }

  // ---- Bootstrap / onboarding ------------------------------------------

  /**
   * Ensures at least one Workspace and one Board exist. Called once on app
   * startup (see §36 "Primeiro Acesso"). Idempotent.
   */
  async ensureDefaultWorkspace(): Promise<{ workspace: Workspace; board: Board }> {
    const existing = await this.workspaces.getAll();
    const defaultWorkspace = existing.find((w) => w.isDefault) ?? existing[0];

    if (defaultWorkspace) {
      const boards = await this.getBoardsForWorkspace(defaultWorkspace.id);
      // Deliberately no `?? boards[0]` fallback here: if every board has
      // been trashed, boards[0] would be a trashed board, and silently
      // treating a trashed board as "active" would resurrect it into view
      // without ever clearing isTrashed — better to create a fresh one.
      const activeBoard = boards.find((b) => !b.isTrashed);
      if (activeBoard) return { workspace: defaultWorkspace, board: activeBoard };
      const board = await this.createBoard(defaultWorkspace.id, "Meu primeiro board");
      return { workspace: defaultWorkspace, board };
    }

    const now = Date.now();
    const workspace: Workspace = {
      id: createId("ws"),
      createdAt: now,
      updatedAt: now,
      version: 1,
      name: "Meu Workspace",
      boardIds: [],
      isDefault: true,
    };
    await this.workspaces.put(workspace);
    const board = await this.createBoard(workspace.id, "Meu primeiro board");
    return { workspace, board };
  }

  async createBoard(workspaceId: string, name: string): Promise<Board> {
    const now = Date.now();
    const board: Board = {
      id: createId("board"),
      workspaceId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      name,
      isFavorite: false,
      isTrashed: false,
      lastOpenedAt: now,
      viewport: { ...DEFAULT_VIEWPORT },
      settings: { ...DEFAULT_BOARD_SETTINGS },
      elementCount: 0,
    };
    await this.boards.put(board);
    const workspace = await this.workspaces.get(workspaceId);
    if (workspace) {
      await this.workspaces.put({
        ...workspace,
        boardIds: [...workspace.boardIds, board.id],
        updatedAt: now,
      });
    }
    return board;
  }
}

/** Singleton instance used across the app. */
export const storageService = new StorageService();
