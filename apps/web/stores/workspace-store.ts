import { create } from "zustand";
import type { Board, Workspace } from "@nexus/types";
import { storageService } from "@nexus/storage";

interface WorkspaceState {
  workspace: Workspace | null;
  boards: Board[];
  loading: boolean;

  bootstrap: () => Promise<{ workspace: Workspace; board: Board }>;
  refreshBoards: () => Promise<void>;
  createBoard: (name: string) => Promise<Board>;
  renameBoard: (boardId: string, name: string) => Promise<void>;
  toggleFavorite: (boardId: string) => Promise<void>;
  trashBoard: (boardId: string) => Promise<void>;
  restoreBoard: (boardId: string) => Promise<void>;
  touchLastOpened: (boardId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  boards: [],
  loading: true,

  bootstrap: async () => {
    set({ loading: true });
    const { workspace, board } = await storageService.ensureDefaultWorkspace();
    const boards = await storageService.getBoardsForWorkspace(workspace.id);
    set({ workspace, boards, loading: false });
    return { workspace, board };
  },

  refreshBoards: async () => {
    const { workspace } = get();
    if (!workspace) return;
    const boards = await storageService.getBoardsForWorkspace(workspace.id);
    set({ boards });
  },

  createBoard: async (name) => {
    const { workspace } = get();
    if (!workspace) throw new Error("No active workspace");
    const board = await storageService.createBoard(workspace.id, name);
    await get().refreshBoards();
    return board;
  },

  renameBoard: async (boardId, name) => {
    const board = await storageService.boards.get(boardId);
    if (!board) return;
    await storageService.boards.put({ ...board, name, updatedAt: Date.now() });
    await get().refreshBoards();
  },

  toggleFavorite: async (boardId) => {
    const board = await storageService.boards.get(boardId);
    if (!board) return;
    await storageService.boards.put({
      ...board,
      isFavorite: !board.isFavorite,
      updatedAt: Date.now(),
    });
    await get().refreshBoards();
  },

  trashBoard: async (boardId) => {
    const board = await storageService.boards.get(boardId);
    if (!board) return;
    await storageService.boards.put({
      ...board,
      isTrashed: true,
      trashedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await get().refreshBoards();
  },

  restoreBoard: async (boardId) => {
    const board = await storageService.boards.get(boardId);
    if (!board) return;
    await storageService.boards.put({
      ...board,
      isTrashed: false,
      trashedAt: undefined,
      updatedAt: Date.now(),
    });
    await get().refreshBoards();
  },

  touchLastOpened: async (boardId) => {
    const board = await storageService.boards.get(boardId);
    if (!board) return;
    await storageService.boards.put({ ...board, lastOpenedAt: Date.now() });
    // Every other mutator here refreshes `boards` so the reactive list
    // (used for "recentes" sorting in Dashboard/Sidebar) stays in sync —
    // this one was the one exception, so opening a board didn't visibly
    // reorder "recentes" until some unrelated action happened to refresh it.
    await get().refreshBoards();
  },
}));
