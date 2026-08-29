-- ============================================================================
-- Fix infinite recursion in RLS policies
-- ============================================================================
-- The documents ↔ document_shares policies form a cycle:
--   documents SELECT → queries document_shares → queries documents → ∞
-- We break the cycle with SECURITY DEFINER helpers that bypass RLS.
-- ============================================================================

-- Helper: is the current user the owner of this document?
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

-- Helper: is the current user shared on this document?
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

-- Helper: is the current user an editor on this document?
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
-- DOCUMENTS policies
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
-- DOCUMENT_SHARES policies
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
-- SHARE_LINKS policies
-- ============================================================================

drop policy if exists "share_links_owner_manage" on public.share_links;
create policy "share_links_owner_manage"
  on public.share_links for all
  using (public.is_document_owner(document_id))
  with check (public.is_document_owner(document_id));

-- ============================================================================
-- BOARD_CONTENT policies (from migration 0002 — also had recursion)
-- ============================================================================

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
-- BOARD_PRESENCE policies (from migration 0002 — also had recursion)
-- ============================================================================

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
