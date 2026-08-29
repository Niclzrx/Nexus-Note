-- ============================================================================
-- Nexus Note — Fase 5: Real-time Sharing
-- ============================================================================
-- Adds board_content table for syncing board content (elements, connections,
-- groups) via Supabase Realtime, plus presence tracking for cursors/avatars.
-- ============================================================================

-- board_content: stores the actual board data for real-time sync.
-- Each row is one element, connection, or group. The composite PK
-- (document_id, content_type, content_id) ensures upserts are idempotent.
create table if not exists public.board_content (
  document_id text not null references public.documents(id) on delete cascade,
  content_type text not null check (content_type in ('element', 'connection', 'group')),
  content_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key (document_id, content_type, content_id)
);

create index if not exists board_content_document_id_idx on public.board_content (document_id);

-- board_presence: tracks who is currently viewing/editing a board.
-- Updated periodically via client heartbeats; cleaned up on disconnect.
create table if not exists public.board_presence (
  document_id text not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  cursor_x double precision,
  cursor_y double precision,
  last_seen_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index if not exists board_presence_document_id_idx on public.board_presence (document_id);

-- Enable Realtime for both tables
alter publication supabase_realtime add table public.board_content;
alter publication supabase_realtime add table public.board_presence;

-- RLS for board_content
alter table public.board_content enable row level security;

-- SELECT: owner or shared user (viewer/editor)
drop policy if exists "board_content_select" on public.board_content;
create policy "board_content_select"
  on public.board_content for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_id = (select auth.uid())
          or exists (
            select 1 from public.document_shares s
            where s.document_id = d.id and s.user_id = (select auth.uid())
          )
        )
    )
  );

-- INSERT: owner or editor
drop policy if exists "board_content_insert" on public.board_content;
create policy "board_content_insert"
  on public.board_content for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_id = (select auth.uid())
          or exists (
            select 1 from public.document_shares s
            where s.document_id = d.id and s.user_id = (select auth.uid()) and s.permission = 'editor'
          )
        )
    )
  );

-- UPDATE: owner or editor
drop policy if exists "board_content_update" on public.board_content;
create policy "board_content_update"
  on public.board_content for update
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_id = (select auth.uid())
          or exists (
            select 1 from public.document_shares s
            where s.document_id = d.id and s.user_id = (select auth.uid()) and s.permission = 'editor'
          )
        )
    )
  );

-- DELETE: owner or editor
drop policy if exists "board_content_delete" on public.board_content;
create policy "board_content_delete"
  on public.board_content for delete
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_id = (select auth.uid())
          or exists (
            select 1 from public.document_shares s
            where s.document_id = d.id and s.user_id = (select auth.uid()) and s.permission = 'editor'
          )
        )
    )
  );

-- RLS for board_presence
alter table public.board_presence enable row level security;

-- SELECT: owner or shared user
drop policy if exists "board_presence_select" on public.board_presence;
create policy "board_presence_select"
  on public.board_presence for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_id = (select auth.uid())
          or exists (
            select 1 from public.document_shares s
            where s.document_id = d.id and s.user_id = (select auth.uid())
          )
        )
    )
  );

-- INSERT/UPDATE: owner or shared user (any permission level can show cursor)
drop policy if exists "board_presence_upsert" on public.board_presence;
create policy "board_presence_upsert"
  on public.board_presence for all
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_id = (select auth.uid())
          or exists (
            select 1 from public.document_shares s
            where s.document_id = d.id and s.user_id = (select auth.uid())
          )
        )
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_id = (select auth.uid())
          or exists (
            select 1 from public.document_shares s
            where s.document_id = d.id and s.user_id = (select auth.uid())
          )
        )
    )
  );

-- DELETE: own presence only (cleaned up on disconnect)
drop policy if exists "board_presence_delete" on public.board_presence;
create policy "board_presence_delete"
  on public.board_presence for delete
  using (user_id = (select auth.uid()));
