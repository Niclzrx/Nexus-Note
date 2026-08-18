"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Panel } from "@nexus/design-system";
import { Search, X, UserPlus } from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import {
  listSharesForDocument,
  removeShare,
  searchUsersForSharing,
  shareDocument,
  updateSharePermission,
  type ShareRow,
  type SharePermission,
} from "../../lib/supabase/documents";

export function ShareDialog({
  boardId,
  boardTitle,
  open,
  onClose,
}: {
  boardId: string;
  boardTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; username: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function refreshShares() {
    const rows = await listSharesForDocument(boardId);
    setShares(rows);
  }

  useEffect(() => {
    if (open) void refreshShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, boardId]);

  useEffect(() => {
    if (!profile) return;
    const timeoutId = setTimeout(() => {
      void searchUsersForSharing(query, profile.id).then((users) =>
        setResults(users.filter((u) => !shares.some((s) => s.user_id === u.id))),
      );
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [query, profile, shares]);

  async function handleAdd(userId: string, permission: SharePermission) {
    setBusyUserId(userId);
    setError(null);
    const err = await shareDocument(boardId, userId, permission);
    if (err) setError(err);
    else {
      setQuery("");
      setResults([]);
      await refreshShares();
    }
    setBusyUserId(null);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <Panel elevated className="w-[420px] overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 className="font-display text-sm font-semibold text-text">Compartilhar</h2>
                  <p className="truncate text-xs text-text-faint">{boardTitle}</p>
                </div>
                <button type="button" onClick={onClose} aria-label="Fechar" className="text-text-faint hover:text-text">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-2.5 py-1.5">
                  <Search className="h-3.5 w-3.5 text-text-faint" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por usuário…"
                    className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
                  />
                </div>

                {results.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {results.map((u) => (
                      <div key={u.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                        <span className="text-text">{u.username}</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={busyUserId === u.id}
                            onClick={() => handleAdd(u.id, "viewer")}
                            className="rounded-sm border border-border px-2 py-1 text-[11px] text-text-muted hover:border-border-strong disabled:opacity-50"
                          >
                            Viewer
                          </button>
                          <button
                            type="button"
                            disabled={busyUserId === u.id}
                            onClick={() => handleAdd(u.id, "editor")}
                            className="flex items-center gap-1 rounded-sm bg-signal px-2 py-1 text-[11px] text-white hover:bg-signal/90 disabled:opacity-50"
                          >
                            <UserPlus className="h-3 w-3" /> Editor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}

                <div className="mt-4">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-faint">
                    Com acesso
                  </p>
                  {shares.length === 0 ? (
                    <p className="py-2 text-xs text-text-faint">Só você tem acesso a este board.</p>
                  ) : (
                    <div className="space-y-1">
                      {shares.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                          <span className="text-text">{s.username}</span>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={s.permission}
                              onChange={async (e) => {
                                await updateSharePermission(s.id, e.target.value as SharePermission);
                                await refreshShares();
                              }}
                              className="rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 text-[11px] text-text-muted outline-none"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                            <button
                              type="button"
                              onClick={async () => {
                                await removeShare(s.id);
                                await refreshShares();
                              }}
                              aria-label={`Remover acesso de ${s.username}`}
                              className="text-text-faint hover:text-error"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
