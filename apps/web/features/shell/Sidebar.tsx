"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { IconButton, cx } from "@nexus/design-system";
import {
  LayoutDashboard,
  Star,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Sparkles,
  Trash2,
  User,
  LogOut,
  X,
} from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspace-store";
import { useUiStore } from "../../stores/ui-store";
import { useAuth } from "../../hooks/use-auth";
import { useIsMobile } from "../../hooks/use-media-query";
import { deleteDocumentOwnership } from "../../lib/supabase/documents";

export function Sidebar() {
  const isMobile = useIsMobile();
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();

  // Closing on navigation is what makes a drawer feel like a drawer instead
  // of a page that happens to cover the screen — without this, picking a
  // board from the mobile sidebar would leave the drawer sitting open over
  // the board you just navigated to.
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-sidebar bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-sidebar w-72 max-w-[85vw]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <SidebarContent onNavigate={() => setMobileOpen(false)} showCloseButton />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    );
  }

  return <DesktopSidebar />;
}

function DesktopSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  if (collapsed) {
    return (
      <div className="flex h-full w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface py-3">
        <IconButton label="Expandir sidebar" onClick={toggleSidebar}>
          <PanelLeftOpen />
        </IconButton>
        <div className="mt-2 h-8 w-8 rounded-md bg-signal/15" />
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-r border-border">
      <SidebarContent
        headerAction={
          <IconButton label="Recolher sidebar" size="sm" onClick={toggleSidebar}>
            <PanelLeftClose />
          </IconButton>
        }
      />
    </div>
  );
}

/**
 * Shared sidebar body — one implementation, rendered either as the
 * always-visible desktop column (via DesktopSidebar) or inside the mobile
 * overlay drawer (via Sidebar). Duplicating this between two components
 * would be exactly the kind of drift that eventually makes the mobile
 * sidebar quietly fall behind the desktop one as features get added.
 */
function SidebarContent({
  onNavigate,
  headerAction,
  showCloseButton,
}: {
  onNavigate?: () => void;
  headerAction?: React.ReactNode;
  showCloseButton?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const boards = useWorkspaceStore((s) => s.boards);
  const createBoard = useWorkspaceStore((s) => s.createBoard);
  const toggleFavorite = useWorkspaceStore((s) => s.toggleFavorite);
  const trashBoard = useWorkspaceStore((s) => s.trashBoard);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const { profile, signOut } = useAuth();
  const [query, setQuery] = useState("");

  const activeBoards = useMemo(
    () =>
      boards
        .filter((b) => !b.isTrashed)
        .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt),
    [boards, query],
  );
  const favorites = activeBoards.filter((b) => b.isFavorite);

  async function handleCreate() {
    const board = await createBoard("Board sem título");
    onNavigate?.();
    router.push(`/board/${board.id}`);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Mover este board para a lixeira?")) return;
    await trashBoard(id);
    void deleteDocumentOwnership(id);
    if (pathname === `/board/${id}`) router.push("/dashboard");
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between px-3.5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal/15 text-signal">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight text-text">
            Nexus Note
          </span>
        </div>
        {showCloseButton ? (
          <IconButton label="Fechar menu" size="sm" onClick={() => setMobileOpen(false)}>
            <X />
          </IconButton>
        ) : (
          headerAction
        )}
      </div>

      <nav className="px-2.5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cx(
            "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
            pathname === "/dashboard"
              ? "bg-signal/15 text-signal"
              : "text-text-muted hover:bg-surface-elevated hover:text-text",
          )}
        >
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </Link>
      </nav>

      <div className="mt-3 px-3.5">
        <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar boards…"
            className="w-full bg-transparent text-xs text-text outline-none placeholder:text-text-faint"
          />
        </div>
      </div>

      <div className="nx-scroll mt-4 flex-1 overflow-y-auto px-2.5 pb-4">
        {favorites.length > 0 ? (
          <SidebarSection title="Favoritos" icon={Star}>
            {favorites.map((b) => (
              <BoardRow
                key={b.id}
                id={b.id}
                name={b.name}
                active={pathname === `/board/${b.id}`}
                favorite
                onNavigate={onNavigate}
                onToggleFavorite={() => toggleFavorite(b.id)}
                onDelete={() => handleDelete(b.id)}
              />
            ))}
          </SidebarSection>
        ) : null}

        <SidebarSection
          title="Boards"
          icon={FileText}
          action={
            <IconButton label="Novo board" size="sm" onClick={handleCreate}>
              <Plus />
            </IconButton>
          }
        >
          {activeBoards.length === 0 ? (
            query ? (
              <p className="px-2.5 py-3 text-center text-xs text-text-faint">
                Nenhum board encontrado para &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-2 px-2.5 py-6 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="text-xs text-text-muted">Nenhum board ainda</p>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="text-[11px] font-medium text-signal hover:underline"
                >
                  Criar o primeiro
                </button>
              </div>
            )
          ) : (
            activeBoards.map((b) => (
              <BoardRow
                key={b.id}
                id={b.id}
                name={b.name}
                active={pathname === `/board/${b.id}`}
                favorite={b.isFavorite}
                onNavigate={onNavigate}
                onToggleFavorite={() => toggleFavorite(b.id)}
                onDelete={() => handleDelete(b.id)}
              />
            ))
          )}
        </SidebarSection>
      </div>

      <div className="border-t border-border px-3.5 py-2.5">
        <Link
          href="/account"
          onClick={onNavigate}
          className={cx(
            "flex items-center justify-between rounded-md px-1.5 py-1.5 text-xs transition-colors hover:bg-surface-elevated",
            pathname === "/account" ? "text-signal" : "text-text-muted",
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{profile?.username ?? "…"}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              void signOut();
            }}
            aria-label="Sair"
            className="shrink-0 text-text-faint hover:text-error"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

function SidebarSection({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof Star;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between px-2.5">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-faint">
          <Icon className="h-3 w-3" /> {title}
        </span>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function BoardRow({
  id,
  name,
  active,
  favorite,
  onNavigate,
  onToggleFavorite,
  onDelete,
}: {
  id: string;
  name: string;
  active: boolean;
  favorite: boolean;
  onNavigate?: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <Link
      href={`/board/${id}`}
      onClick={onNavigate}
      className={cx(
        "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active ? "bg-signal/15 text-signal" : "text-text-muted hover:bg-surface-elevated hover:text-text",
      )}
    >
      <span className="truncate">{name}</span>
      <span className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite();
          }}
          className={cx(
            "opacity-0 transition-opacity group-hover:opacity-100",
            favorite && "opacity-100 text-ember",
          )}
          aria-label="Favoritar"
        >
          <Star className="h-3.5 w-3.5" fill={favorite ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
          aria-label="Mover para a lixeira"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </span>
    </Link>
  );
}
