"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  CheckSquare,
  Code2,
  LayoutDashboard,
  Link as LinkIcon,
  List,
  ListChecks,
  Moon,
  Plus,
  Redo2,
  Search,
  StickyNote,
  Sun,
  Type,
  Undo2,
  Gauge,
} from "lucide-react";
import { Panel } from "@nexus/design-system";
import type { ElementType } from "@nexus/types";
import { storageService } from "@nexus/storage";
import { useUiStore } from "../../stores/ui-store";
import { useWorkspaceStore } from "../../stores/workspace-store";
import { useHistoryStore } from "../../stores/history-store";
import { useElementStore } from "../../stores/element-store";

interface Item {
  id: string;
  label: string;
  subtitle?: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
}

const ELEMENT_ICON: Partial<Record<ElementType, typeof Search>> = {
  note: StickyNote,
  text: Type,
  task: CheckSquare,
  checklist: ListChecks,
  list: List,
  link: LinkIcon,
  bookmark: Bookmark,
  code: Code2,
};

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const setTheme = useUiStore((s) => s.setTheme);
  const setPendingFocusElementId = useUiStore((s) => s.setPendingFocusElementId);
  const createBoard = useWorkspaceStore((s) => s.createBoard);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<
    { element: { id: string; boardId: string; type: ElementType }; boardName: string; snippet: string }[]
  >([]);

  const actions: Item[] = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Ir para o Dashboard",
        icon: LayoutDashboard,
        run: () => router.push("/dashboard"),
      },
      {
        id: "new-board",
        label: "Criar novo board",
        icon: Plus,
        run: async () => {
          const board = await createBoard("Board sem título");
          router.push(`/board/${board.id}`);
        },
      },
      {
        id: "theme",
        label: resolvedTheme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro",
        icon: resolvedTheme === "dark" ? Sun : Moon,
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "undo",
        label: "Desfazer",
        hint: "Ctrl+Z",
        icon: Undo2,
        run: () => useHistoryStore.getState().undo(),
      },
      {
        id: "redo",
        label: "Refazer",
        hint: "Ctrl+Shift+Z",
        icon: Redo2,
        run: () => useHistoryStore.getState().redo(),
      },
      {
        id: "perf-1k",
        label: "Fase 5 · Gerar 1.000 elementos de teste (board atual)",
        icon: Gauge,
        run: () => useElementStore.getState().seedSyntheticElements(1_000),
      },
      {
        id: "perf-10k",
        label: "Fase 5 · Gerar 10.000 elementos de teste (board atual)",
        icon: Gauge,
        run: () => useElementStore.getState().seedSyntheticElements(10_000),
      },
      {
        id: "perf-50k",
        label: "Fase 5 · Gerar 50.000 elementos de teste (board atual)",
        icon: Gauge,
        run: () => useElementStore.getState().seedSyntheticElements(50_000),
      },
    ],
    [resolvedTheme, setTheme, createBoard, router],
  );

  const filteredActions = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  const searchItems: Item[] = searchResults.map((r) => ({
    id: `el:${r.element.id}`,
    label: r.snippet || "(sem conteúdo)",
    subtitle: r.boardName,
    icon: ELEMENT_ICON[r.element.type] ?? StickyNote,
    run: () => {
      setPendingFocusElementId(r.element.id);
      router.push(`/board/${r.element.boardId}`);
    },
  }));

  const items = [...filteredActions, ...searchItems];

  // ---- Debounced cross-board element search ----
  // A single setTimeout scoped to this effect run, cleared on the next
  // keystroke via the cleanup function — this is what actually debounces,
  // unlike calling a freshly-constructed debounce() wrapper on every render
  // (which has no shared timer to cancel, so every keystroke still fires
  // its own delayed search). We also drop any response that resolves after
  // the query has since changed, in case an older search resolves late.
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      void storageService.searchElements(query, 8).then((results) => {
        setSearchResults(
          results.map((r) => ({
            element: { id: r.element.id, boardId: r.element.boardId, type: r.element.type },
            boardName: r.boardName,
            snippet: r.snippet,
          })),
        );
      });
    }, 180);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      setSearchResults([]);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [searchResults.length]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        items[activeIndex]?.run();
        setOpen(false);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items, activeIndex, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-modal flex items-start justify-center bg-black/50 pt-[18vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <Panel elevated className="w-[480px] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
                <Search className="h-4 w-4 text-text-faint" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder="Digite um comando ou busque em todos os boards…"
                  className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
                />
              </div>
              <div className="max-h-80 overflow-y-auto p-1.5">
                {items.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-text-faint">Nada encontrado.</p>
                ) : (
                  <>
                    {filteredActions.length > 0 ? (
                      <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-text-faint">
                        Ações
                      </p>
                    ) : null}
                    {items.map((item, i) => {
                      const isFirstResult = i === filteredActions.length && searchItems.length > 0;
                      return (
                        <div key={item.id}>
                          {isFirstResult ? (
                            <p className="px-2.5 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-text-faint">
                              Em seus boards
                            </p>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              item.run();
                              setOpen(false);
                            }}
                            onMouseEnter={() => setActiveIndex(i)}
                            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                              i === activeIndex ? "bg-signal/15 text-signal" : "text-text-muted"
                            }`}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.subtitle ? (
                              <span className="shrink-0 text-[10px] text-text-faint">{item.subtitle}</span>
                            ) : null}
                            {item.hint ? (
                              <span className="shrink-0 font-mono text-[10px] text-text-faint">{item.hint}</span>
                            ) : null}
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </Panel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
