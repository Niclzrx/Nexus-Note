-- ============================================================================
-- Nexus Note — Migration 0002: Real-time Sharing + RLS Fix
-- ============================================================================
-- Combines board_content/board_presence tables with SECURITY DEFINER helpers
-- to avoid infinite RLS recursion. Run this single migration.
-- ============================================================================

-- ============================================================================
-- SECURITY DEFINER helpers (break RLS recursion)
-- ============================================================================

create or replace function public.is_document_owner(p_document_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.documents
    where id = p_document_id and owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_document_owner(text) from public;
grant execute on function public.is_document_owner(text) to authenticated;

create or replace function public.is_document_shared_with_user(p_document_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.document_shares
    where document_id = p_document_id and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_document_shared_with_user(text) from public;
grant execute on function public.is_document_shared_with_user(text) to authenticated;

create or replace function public.is_document_editor(p_document_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.document_shares
    where document_id = p_document_id and user_id = (select auth.uid()) and permission = 'editor'
  );
$$;

revoke all on function public.is_document_editor(text) from public;
grant execute on function public.is_document_editor(text) to authenticated;

-- ============================================================================
-- Fix DOCUMENTS policies (use helpers to break recursion)
-- ============================================================================

drop policy if exists "documents_select_owner_or_shared" on public.documents;
create policy "documents_select_owner_or_shared"
  on public.documents for select
  using (
    owner_id = (select auth.uid())
    or public.is_document_shared_with_user(id)
  );

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own"
  on public.documents for insert
  with check (owner_id = (select auth.uid()));

drop policy if exists "documents_update_owner_or_editor" on public.documents;
create policy "documents_update_owner_or_editor"
  on public.documents for update
  using (
    owner_id = (select auth.uid())
    or public.is_document_editor(id)
  );

drop policy if exists "documents_delete_owner" on public.documents;
create policy "documents_delete_owner"
  on public.documents for delete
  using (owner_id = (select auth.uid()));

-- ============================================================================
-- Fix DOCUMENT_SHARES policies
-- ============================================================================

drop policy if exists "shares_select_owner_or_self" on public.document_shares;
create policy "shares_select_owner_or_self"
  on public.document_shares for select
  using (
    user_id = (select auth.uid())
    or public.is_document_owner(document_id)
  );

drop policy if exists "shares_insert_owner_only" on public.document_shares;
create policy "shares_insert_owner_only"
  on public.document_shares for insert
  with check (
    public.is_document_owner(document_id)
    and user_id <> (select auth.uid())
  );

drop policy if exists "shares_update_owner_only" on public.document_shares;
create policy "shares_update_owner_only"
  on public.document_shares for update
  using (public.is_document_owner(document_id));

drop policy if exists "shares_delete_owner_only" on public.document_shares;
create policy "shares_delete_owner_only"
  on public.document_shares for delete
  using (public.is_document_owner(document_id));

-- ============================================================================
-- Fix SHARE_LINKS policies
-- ============================================================================

drop policy if exists "share_links_owner_manage" on public.share_links;
create policy "share_links_owner_manage"
  on public.share_links for all
  using (public.is_document_owner(document_id))
  with check (public.is_document_owner(document_id));

-- ============================================================================
-- BOARD_CONTENT: stores board data for real-time sync
-- ============================================================================

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

-- BOARD_PRESENCE: tracks who is currently viewing/editing a board

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

-- Enable Realtime

alter publication supabase_realtime add table public.board_content;
alter publication supabase_realtime add table public.board_presence;

-- ============================================================================
-- RLS for board_content
-- ============================================================================

alter table public.board_content enable row level security;

drop policy if exists "board_content_select" on public.board_content;
create policy "board_content_select"
  on public.board_content for select
  using (
    public.is_document_owner(document_id)
    or public.is_document_shared_with_user(document_id)
  );

drop policy if exists "board_content_insert" on public.board_content;
create policy "board_content_insert"
  on public.board_content for insert
  with check (
    public.is_document_owner(document_id)
    or public.is_document_editor(document_id)
  );

drop policy if exists "board_content_update" on public.board_content;
create policy "board_content_update"
  on public.board_content for update
  using (
    public.is_document_owner(document_id)
    or public.is_document_editor(document_id)
  );

drop policy if exists "board_content_delete" on public.board_content;
create policy "board_content_delete"
  on public.board_content for delete
  using (
    public.is_document_owner(document_id)
    or public.is_document_editor(document_id)
  );

-- ============================================================================
-- RLS for board_presence
-- ============================================================================

alter table public.board_presence enable row level security;

drop policy if exists "board_presence_select" on public.board_presence;
create policy "board_presence_select"
  on public.board_presence for select
  using (
    public.is_document_owner(document_id)
    or public.is_document_shared_with_user(document_id)
  );

drop policy if exists "board_presence_upsert" on public.board_presence;
create policy "board_presence_upsert"
  on public.board_presence for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "board_presence_delete" on public.board_presence;
create policy "board_presence_delete"
  on public.board_presence for delete
  using (user_id = (select auth.uid()));
