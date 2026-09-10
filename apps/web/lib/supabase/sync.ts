import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { AnyElement, Connection, Group } from "@nexus/types";
import { createSupabaseBrowserClient } from "./client";

// ---- Types ----------------------------------------------------------------

export type ContentRow = {
  document_id: string;
  content_type: "element" | "connection" | "group";
  content_id: string;
  data: AnyElement | Connection | Group;
  updated_at: string;
  updated_by: string | null;
};

export type PresenceState = {
  user_id: string;
  username: string;
  cursor_x: number | null;
  cursor_y: number | null;
  avatar_url?: string;
  color: string;
};

export type ChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: ContentRow | null;
  old: { document_id: string; content_type: string; content_id: string } | null;
};

// ---- Presence color palette ------------------------------------------------

const PRESENCE_COLORS = [
  "#6E8BFF", "#FF6B6B", "#54C491", "#FF9B5C", "#C084FC",
  "#22D3EE", "#F472B6", "#FACC15", "#34D399", "#FB923C",
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]!;
}

// ---- Content sync ----------------------------------------------------------

/**
 * Push a batch of local changes to Supabase. Uses upsert for INSERT/UPDATE
 * and delete for removed items. This is the "write" side of the sync — called
 * after every local mutation in element-store.ts.
 */
export async function pushBoardContent(
  boardId: string,
  options: {
    elements?: AnyElement[];
    connections?: Connection[];
    groups?: Group[];
    deletedElementIds?: string[];
    deletedConnectionIds?: string[];
    deletedGroupIds?: string[];
  },
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const upserts: ContentRow[] = [];

  for (const el of options.elements ?? []) {
    upserts.push({
      document_id: boardId,
      content_type: "element",
      content_id: el.id,
      data: el,
      updated_at: new Date(el.updatedAt).toISOString(),
      updated_by: user.id,
    });
  }
  for (const conn of options.connections ?? []) {
    upserts.push({
      document_id: boardId,
      content_type: "connection",
      content_id: conn.id,
      data: conn,
      updated_at: new Date(conn.updatedAt).toISOString(),
      updated_by: user.id,
    });
  }
  for (const group of options.groups ?? []) {
    upserts.push({
      document_id: boardId,
      content_type: "group",
      content_id: group.id,
      data: group,
      updated_at: new Date(group.updatedAt).toISOString(),
      updated_by: user.id,
    });
  }

  // Upsert in chunks (Supabase has a practical limit per request)
  const CHUNK = 50;
  for (let i = 0; i < upserts.length; i += CHUNK) {
    const chunk = upserts.slice(i, i + CHUNK);
    await supabase
      .from("board_content")
      .upsert(chunk, { onConflict: "document_id,content_type,content_id" });
  }

  // Delete removed items
  const deletes: { content_type: string; content_id: string }[] = [];
  for (const id of options.deletedElementIds ?? []) {
    deletes.push({ content_type: "element", content_id: id });
  }
  for (const id of options.deletedConnectionIds ?? []) {
    deletes.push({ content_type: "connection", content_id: id });
  }
  for (const id of options.deletedGroupIds ?? []) {
    deletes.push({ content_type: "group", content_id: id });
  }

  for (const d of deletes) {
    await supabase
      .from("board_content")
      .delete()
      .eq("document_id", boardId)
      .eq("content_type", d.content_type)
      .eq("content_id", d.content_id);
  }
}

/**
 * Push a single element change. Convenience wrapper for one-off mutations.
 */
export async function pushSingleChange(
  boardId: string,
  contentType: "element" | "connection" | "group",
  data: AnyElement | Connection | Group,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const updatedAt = "updatedAt" in data ? data.updatedAt : Date.now();

  await supabase.from("board_content").upsert(
    {
      document_id: boardId,
      content_type: contentType,
      content_id: data.id,
      data,
      updated_at: new Date(updatedAt).toISOString(),
      updated_by: user.id,
    },
    { onConflict: "document_id,content_type,content_id" },
  );
}

/**
 * Delete a single item from Supabase.
 */
export async function pushSingleDelete(
  boardId: string,
  contentType: "element" | "connection" | "group",
  contentId: string,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase
    .from("board_content")
    .delete()
    .eq("document_id", boardId)
    .eq("content_type", contentType)
    .eq("content_id", contentId);
}

/**
 * Pull all content for a board from Supabase. Used on initial load to
 * merge remote state into local IndexedDB.
 */
export async function pullBoardContent(
  boardId: string,
): Promise<{
  elements: AnyElement[];
  connections: Connection[];
  groups: Group[];
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("board_content")
    .select("content_type, content_id, data")
    .eq("document_id", boardId);

  if (error || !data) return { elements: [], connections: [], groups: [] };

  const elements: AnyElement[] = [];
  const connections: Connection[] = [];
  const groups: Group[] = [];

  for (const row of data) {
    switch (row.content_type) {
      case "element":
        elements.push(row.data as unknown as AnyElement);
        break;
      case "connection":
        connections.push(row.data as unknown as Connection);
        break;
      case "group":
        groups.push(row.data as unknown as Group);
        break;
    }
  }

  return { elements, connections, groups };
}

// ---- Realtime subscriptions ------------------------------------------------

/**
 * Subscribe to content changes for a board. Returns the channel so the
 * caller can unsubscribe when done.
 */
export function subscribeToBoardChanges(
  boardId: string,
  onChange: (payload: ChangePayload) => void,
): RealtimeChannel {
  const supabase = createSupabaseBrowserClient();
  const channel = supabase.channel(`board:${boardId}`);

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "board_content",
      filter: `document_id=eq.${boardId}`,
    },
    (payload: RealtimePostgresChangesPayload<ContentRow>) => {
      onChange(payload as unknown as ChangePayload);
    },
  );

  channel.subscribe();
  return channel;
}

// ---- Presence --------------------------------------------------------------

/**
 * Track and broadcast cursor position for the current user.
 * Returns the channel for cleanup.
 */
export function trackPresence(
  boardId: string,
  userId: string,
  username: string,
): RealtimeChannel {
  const supabase = createSupabaseBrowserClient();
  const channel = supabase.channel(`presence:${boardId}`);

  // Register empty callbacks — the caller adds its own and then subscribes.
  channel
    .on("presence", { event: "sync" }, () => {})
    .on("presence", { event: "join" }, () => {})
    .on("presence", { event: "leave" }, () => {});

  return channel;
}

/**
 * Update cursor position in the presence channel.
 */
export function updatePresenceCursor(
  channel: RealtimeChannel,
  x: number,
  y: number,
  color: string,
): void {
  channel.track({
    cursor_x: x,
    cursor_y: y,
    color,
    last_seen: new Date().toISOString(),
  });
}

/**
 * Get all presence states from a channel as a Map.
 */
export function getPresenceStates(channel: RealtimeChannel): Map<string, PresenceState> {
  const state = channel.presenceState();
  const result = new Map<string, PresenceState>();
  for (const [key, presences] of Object.entries(state)) {
    const latest = (presences as Array<Record<string, unknown>>)[presences.length - 1];
    if (latest) {
      result.set(key, {
        user_id: latest.user_id as string,
        username: latest.username as string,
        cursor_x: latest.cursor_x as number | null,
        cursor_y: latest.cursor_y as number | null,
        color: (latest.color as string) ?? getUserColor(latest.user_id as string),
      });
    }
  }
  return result;
}

/**
 * Untrack presence and remove cursor from Supabase.
 */
export async function untrackPresence(
  channel: RealtimeChannel,
  boardId: string,
  userId: string,
): Promise<void> {
  await channel.untrack();
  const supabase = createSupabaseBrowserClient();
  await supabase
    .from("board_presence")
    .delete()
    .eq("document_id", boardId)
    .eq("user_id", userId);
}
