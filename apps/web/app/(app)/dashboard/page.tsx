"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Clock, LayoutGrid, Menu, Users } from "lucide-react";
import { Button, IconButton } from "@nexus/design-system";
import type { Board } from "@nexus/types";
import { DEFAULT_BOARD_SETTINGS, DEFAULT_VIEWPORT } from "@nexus/types";
import { storageService } from "@nexus/storage";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import { useUiStore } from "../../../stores/ui-store";
import { listSharedBoards, listOwnedBoards, type SharedBoard } from "../../../lib/supabase/documents";

async function syncBoardsFromSupabase() {
  const remoteBoards = await listOwnedBoards();
  const localBoards = useWorkspaceStore.getState().boards;
  const localIds = new Set(localBoards.map((b) => b.id));
  const now = Date.now();

  for (const remote of remoteBoards) {
    if (!localIds.has(remote.id)) {
      // Board exists in Supabase but not locally — create local record
      const localBoard: Board = {
        id: remote.id,
        workspaceId: "default",
        name: remote.title,
        isFavorite: false,
        isTrashed: false,
        lastOpenedAt: now,
        viewport: DEFAULT_VIEWPORT,
        settings: DEFAULT_BOARD_SETTINGS,
        elementCount: 0,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };
      await storageService.boards.put(localBoard);
    }
  }

  // Reload boards from IndexedDB
  useWorkspaceStore.getState().refreshBoards();
}

export default function DashboardPage() {
  const router = useRouter();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const boards = useWorkspaceStore((s) => s.boards);
  const createBoard = useWorkspaceStore((s) => s.createBoard);
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);
  const [sharedBoards, setSharedBoards] = useState<SharedBoard[]>([]);

  useEffect(() => {
    void listSharedBoards().then(setSharedBoards);
    // Fetch boards from Supabase and merge with local IndexedDB
    void syncBoardsFromSupabase();
  }, []);

  const active = useMemo(() => boards.filter((b) => !b.isTrashed), [boards]);
  const recent = useMemo(
    () => [...active].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 8),
    [active],
  );
  const favorites = useMemo(() => active.filter((b) => b.isFavorite), [active]);
  const renameBoard = useWorkspaceStore((s) => s.renameBoard);

  async function handleCreate() {
    const board = await createBoard("Board sem título");
    router.push(`/board/${board.id}`);
  }

  return (
    <div className="nx-scroll h-full overflow-y-auto">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton label="Abrir menu" className="shrink-0 md:hidden" onClick={toggleMobileSidebar}>
            <Menu />
          </IconButton>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold text-text sm:text-xl">
              {workspace?.name}
            </h1>
            <p className="truncate text-xs text-text-muted sm:text-sm">
              {active.length} {active.length === 1 ? "board" : "boards"} · {" "}
              {active.reduce((sum, b) => sum + b.elementCount, 0)} elementos
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="shrink-0">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo board</span>
        </Button>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        {favorites.length > 0 ? (
          <BoardGrid title="Favoritos" icon={Star} boards={favorites} onRename={renameBoard} />
        ) : null}
        <BoardGrid title="Recentes" icon={Clock} boards={recent} onRename={renameBoard} />

        {sharedBoards.length > 0 ? (
          <SharedBoardsGrid boards={sharedBoards} onOpen={(id) => router.push(`/board/${id}`)} />
        ) : null}

        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <LayoutGrid className="mb-3 h-8 w-8 text-text-faint" />
            <p className="font-display text-sm font-medium text-text">Nenhum board ainda</p>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Crie seu primeiro board e comece a conectar suas ideias em um canvas infinito.
            </p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="h-4 w-4" /> Criar meu primeiro board
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BoardGrid({ title, icon: Icon, boards, onRename }: { title: string; icon: typeof Star; boards: Board[]; onRename: (boardId: string, name: string) => Promise<void> }) {
  const router = useRouter();
  if (boards.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-faint">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {boards.map((board) => (
          <BoardCard key={board.id} board={board} onRename={onRename} onOpen={() => router.push(`/board/${board.id}`)} />
        ))}
      </div>
    </section>
  );
}

function BoardCard({ board, onRename, onOpen }: { board: Board; onRename: (boardId: string, name: string) => Promise<void>; onOpen: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);

  return (
    <button
      onClick={(e) => {
        if (editing) return;
        onOpen();
      }}
      className="group flex aspect-[4/3] flex-col justify-between rounded-lg border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-elevated"
    >
      <div className="flex-1 rounded-md bg-canvas-bg bg-[radial-gradient(circle,rgb(var(--color-canvas-dot)/0.4)_1px,transparent_1px)] bg-[length:14px_14px]" />
      <div className="mt-2">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              const trimmed = name.trim();
              if (trimmed && trimmed !== board.name) {
                onRename(board.id, trimmed);
              } else {
                setName(board.name);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setName(board.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full truncate rounded bg-transparent font-display text-sm font-medium text-text outline-none ring-1 ring-signal"
          />
        ) : (
          <p
            className="truncate font-display text-sm font-medium text-text group-hover:text-signal"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {board.name}
          </p>
        )}
        <p className="text-[11px] text-text-faint">{board.elementCount} elementos</p>
      </div>
    </button>
  );
}

function SharedBoardsGrid({ boards, onOpen }: { boards: SharedBoard[]; onOpen: (id: string) => void }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-faint">
        <Users className="h-3.5 w-3.5" /> Compartilhados comigo
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => onOpen(board.id)}
            className="group flex aspect-[4/3] flex-col justify-between rounded-lg border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-elevated"
          >
            <div className="flex-1 rounded-md bg-canvas-bg bg-[radial-gradient(circle,rgb(var(--color-canvas-dot)/0.4)_1px,transparent_1px)] bg-[length:14px_14px]" />
            <div className="mt-2">
              <p className="truncate font-display text-sm font-medium text-text group-hover:text-signal">
                {board.title}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-text-faint">{board.owner_username}</p>
                <span className="rounded-full bg-signal/15 px-1.5 py-0.5 text-[10px] text-signal">
                  {board.permission === "editor" ? "Editor" : "Viewer"}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
