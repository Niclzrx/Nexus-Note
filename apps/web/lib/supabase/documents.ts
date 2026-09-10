import { createSupabaseBrowserClient } from "./client";

export type SharePermission = "editor" | "viewer";

export interface ShareRow {
  id: string;
  document_id: string;
  user_id: string;
  permission: SharePermission;
  username: string;
}

/**
 * Registers local board ownership in Supabase. Fire-and-forget by design:
 * the board is already fully usable locally (IndexedDB) the instant it's
 * created, offline included. If this call fails (offline, RLS misconfig,
 * etc.) the board still works — it just won't be shareable until this
 * succeeds, consistent with local-first being the source of truth for
 * content and Supabase being metadata on top, not the other way around.
 */
export async function registerDocumentOwnership(boardId: string, title: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("documents")
    .insert({ id: boardId, owner_id: user.id, title });
  // Ignore duplicate key (23505) — means ownership is already registered
  if (error && error.code !== "23505") {
    console.error("Failed to register document ownership:", error.message);
  }
}

export async function renameDocument(boardId: string, title: string): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("documents").update({ title }).eq("id", boardId);
  if (error) {
    console.error("Failed to rename document:", error.message);
    return error.message;
  }
  return null;
}

export async function deleteDocumentOwnership(boardId: string): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("documents").delete().eq("id", boardId);
  if (error) {
    console.error("Failed to delete document ownership:", error.message);
    return error.message;
  }
  return null;
}

export async function listSharesForDocument(boardId: string): Promise<{ rows: ShareRow[]; error: string | null }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("document_shares")
    .select("id, document_id, user_id, permission, profiles(username)")
    .eq("document_id", boardId);
  if (error || !data) {
    const msg = error?.message ?? "Unknown error loading shares";
    console.error("listSharesForDocument failed:", msg);
    return { rows: [], error: msg };
  }
  return {
    rows: data.map((row) => ({
      id: row.id as string,
      document_id: row.document_id as string,
      user_id: row.user_id as string,
      permission: row.permission as SharePermission,
      username: (row.profiles as unknown as { username: string } | null)?.username ?? "?",
    })),
    error: null,
  };
}

export async function searchUsersForSharing(
  query: string,
  excludeUserId: string,
): Promise<{ id: string; username: string }[]> {
  if (query.trim().length < 2) return [];
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", `%${query.trim()}%`)
    .neq("id", excludeUserId)
    .limit(6);
  if (error || !data) {
    console.error("searchUsersForSharing failed:", error?.message ?? "Unknown error");
    return [];
  }
  return data;
}

export async function shareDocument(
  boardId: string,
  targetUserId: string,
  permission: SharePermission,
  boardTitle?: string,
): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Faça login para compartilhar.";

  // Ensure the document exists in Supabase (insert if not exists).
  const { error: insertErr } = await supabase
    .from("documents")
    .insert({ id: boardId, owner_id: user.id, title: boardTitle ?? "Board" });
  // Ignore duplicate key (23505) — document already registered
  if (insertErr && insertErr.code !== "23505") {
    console.error("shareDocument: documents insert failed:", insertErr.message);
    return `Erro ao registrar board: ${insertErr.message}`;
  }

  const { error } = await supabase
    .from("document_shares")
    .upsert({ document_id: boardId, user_id: targetUserId, permission }, { onConflict: "document_id,user_id" });
  if (error) {
    console.error("shareDocument: document_shares upsert failed:", error.message);
    return `Não foi possível compartilhar: ${error.message}`;
  }
  return null;
}

export async function updateSharePermission(
  shareId: string,
  permission: SharePermission,
): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("document_shares").update({ permission }).eq("id", shareId);
  if (error) {
    console.error("updateSharePermission failed:", error.message);
    return error.message;
  }
  return null;
}

export async function removeShare(shareId: string): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("document_shares").delete().eq("id", shareId);
  if (error) {
    console.error("removeShare failed:", error.message);
    return error.message;
  }
  return null;
}

export interface SharedBoard {
  id: string;
  title: string;
  owner_username: string;
  permission: SharePermission;
}

export async function listOwnedBoards(): Promise<{ id: string; title: string }[]> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("documents")
    .select("id, title")
    .eq("owner_id", user.id);

  if (error || !data) {
    console.error("listOwnedBoards failed:", error?.message ?? "Unknown error");
    return [];
  }
  return data;
}

export async function getSharedBoardMeta(
  boardId: string,
): Promise<{ id: string; title: string; permission: SharePermission } | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("document_shares")
    .select("document_id, permission, documents(id, title)")
    .eq("document_id", boardId)
    .eq("user_id", user.id)
    .single();

  if (error || !data || !data.documents) {
    console.error("getSharedBoardMeta failed:", error?.message ?? "Not found or not shared");
    return null;
  }

  return {
    id: data.document_id,
    title: (data.documents as unknown as { title: string }).title,
    permission: data.permission as SharePermission,
  };
}

export async function listSharedBoards(): Promise<SharedBoard[]> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("document_shares")
    .select("document_id, permission, documents(id, title), profiles!document_shares_user_id_fkey(username)")
    .eq("user_id", user.id);

  if (error || !data) {
    console.error("listSharedBoards failed:", error?.message ?? "Unknown error");
    return [];
  }

  return data
    .filter((row) => row.documents)
    .map((row) => ({
      id: row.document_id,
      title: (row.documents as unknown as { title: string }).title,
      owner_username: (row.profiles as unknown as { username: string } | null)?.username ?? "?",
      permission: row.permission as SharePermission,
    }));
}

export interface DocumentCounts {
  owned: number;
  sharedWithMe: number;
}

export async function getDocumentCounts(userId: string): Promise<DocumentCounts> {
  const supabase = createSupabaseBrowserClient();
  const [owned, shared] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    supabase.from("document_shares").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return { owned: owned.count ?? 0, sharedWithMe: shared.count ?? 0 };
}
