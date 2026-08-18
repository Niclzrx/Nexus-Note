"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Clock, LayoutGrid } from "lucide-react";
import { Button } from "@nexus/design-system";
import type { Board } from "@nexus/types";
import { useWorkspaceStore } from "../../../stores/workspace-store";

export default function DashboardPage() {
  const router = useRouter();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const boards = useWorkspaceStore((s) => s.boards);
  const createBoard = useWorkspaceStore((s) => s.createBoard);

  const active = useMemo(() => boards.filter((b) => !b.isTrashed), [boards]);
  const recent = useMemo(
    () => [...active].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 8),
    [active],
  );
  const favorites = useMemo(() => active.filter((b) => b.isFavorite), [active]);

  async function handleCreate() {
    const board = await createBoard("Board sem título");
    router.push(`/board/${board.id}`);
  }

  return (
    <div className="nx-scroll h-full overflow-y-auto">
      <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-text">{workspace?.name}</h1>
          <p className="text-sm text-text-muted">
            {active.length} {active.length === 1 ? "board" : "boards"} · {" "}
            {active.reduce((sum, b) => sum + b.elementCount, 0)} elementos
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" /> Novo board
        </Button>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">
        {favorites.length > 0 ? (
          <BoardGrid title="Favoritos" icon={Star} boards={favorites} />
        ) : null}
        <BoardGrid title="Recentes" icon={Clock} boards={recent} />

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

function BoardGrid({ title, icon: Icon, boards }: { title: string; icon: typeof Star; boards: Board[] }) {
  const router = useRouter();
  if (boards.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-faint">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => router.push(`/board/${board.id}`)}
            className="group flex aspect-[4/3] flex-col justify-between rounded-lg border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-elevated"
          >
            <div className="flex-1 rounded-md bg-canvas-bg bg-[radial-gradient(circle,rgb(var(--color-canvas-dot)/0.4)_1px,transparent_1px)] bg-[length:14px_14px]" />
            <div className="mt-2">
              <p className="truncate font-display text-sm font-medium text-text group-hover:text-signal">
                {board.name}
              </p>
              <p className="text-[11px] text-text-faint">{board.elementCount} elementos</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
