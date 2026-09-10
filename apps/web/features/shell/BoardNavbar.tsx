"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Cloud,
  CloudOff,
  Loader2,
  Menu,
  Moon,
  Sun,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import { IconButton } from "@nexus/design-system";
import type { Board } from "@nexus/types";
import { useUiStore, type SaveStatus } from "../../stores/ui-store";
import { useWorkspaceStore } from "../../stores/workspace-store";
import { useHistoryStore } from "../../stores/history-store";

const statusConfig: Record<SaveStatus, { icon: typeof Cloud; label: string; className: string }> = {
  idle: { icon: Cloud, label: "Salvo", className: "text-text-faint" },
  saved: { icon: Cloud, label: "Salvo", className: "text-success" },
  saving: { icon: Loader2, label: "Salvando…", className: "text-text-muted animate-spin" },
  offline: { icon: CloudOff, label: "Offline", className: "text-text-faint" },
  error: { icon: CloudOff, label: "Erro ao salvar", className: "text-error" },
};

export function BoardNavbar({ board }: { board: Board }) {
  const router = useRouter();
  const [name, setName] = useState(board.name);
  const renameBoard = useWorkspaceStore((s) => s.renameBoard);
  const trashBoard = useWorkspaceStore((s) => s.trashBoard);
  const saveStatus = useUiStore((s) => s.saveStatus);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const setTheme = useUiStore((s) => s.setTheme);
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);
  const status = statusConfig[saveStatus];

  async function handleDeleteBoard() {
    if (!window.confirm(`Mover "${board.name}" para a lixeira? Você pode restaurar depois.`)) return;
    await trashBoard(board.id);
    router.push("/dashboard");
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-text-muted">
        <IconButton label="Abrir menu" size="sm" className="mr-0.5 md:hidden" onClick={toggleMobileSidebar}>
          <Menu />
        </IconButton>
        <Link href="/dashboard" className="hidden shrink-0 hover:text-text sm:inline">
          Dashboard
        </Link>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-text-faint sm:block" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const trimmed = name.trim();
            if (!trimmed) return;
            renameBoard(board.id, trimmed);
          }}
          className="min-w-0 flex-1 truncate bg-transparent font-display text-sm font-medium text-text outline-none"
        />
      </div>

      <div className="flex items-center gap-1">
        <IconButton label="Desfazer (Ctrl+Z)" size="sm" onClick={() => useHistoryStore.getState().undo()}>
          <Undo2 />
        </IconButton>
        <IconButton label="Refazer (Ctrl+Shift+Z)" size="sm" onClick={() => useHistoryStore.getState().redo()}>
          <Redo2 />
        </IconButton>

        <div className="mx-1.5 h-5 w-px bg-border" />

        <span className={`flex items-center gap-1.5 px-1.5 text-xs ${status.className}`}>
          <status.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{status.label}</span>
        </span>

        <IconButton
          label="Alternar tema"
          size="sm"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
        </IconButton>

        <IconButton label="Excluir board" size="sm" onClick={handleDeleteBoard}>
          <Trash2 />
        </IconButton>
      </div>
    </header>
  );
}
