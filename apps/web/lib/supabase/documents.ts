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
  await supabase.from("documents").upsert({ id: boardId, owner_id: user.id, title });
}

export async function renameDocument(boardId: string, title: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("documents").update({ title }).eq("id", boardId);
}

export async function deleteDocumentOwnership(boardId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("documents").delete().eq("id", boardId);
}

export async function listSharesForDocument(boardId: string): Promise<ShareRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("document_shares")
    .select("id, document_id, user_id, permission, profiles(username)")
    .eq("document_id", boardId);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    document_id: row.document_id as string,
    user_id: row.user_id as string,
    permission: row.permission as SharePermission,
    username: (row.profiles as unknown as { username: string } | null)?.username ?? "?",
  }));
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
  if (error || !data) return [];
  return data;
}

export async function shareDocument(
  boardId: string,
  targetUserId: string,
  permission: SharePermission,
): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("document_shares")
    .upsert({ document_id: boardId, user_id: targetUserId, permission }, { onConflict: "document_id,user_id" });
  if (error) return "Não foi possível compartilhar. Verifique se você é o dono deste board.";
  return null;
}

export async function updateSharePermission(shareId: string, permission: SharePermission): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("document_shares").update({ permission }).eq("id", shareId);
}

export async function removeShare(shareId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("document_shares").delete().eq("id", shareId);
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
