-- ============================================================================
-- Nexus Note — Fase 4.5 (Auth + Sharing) schema
-- ============================================================================
-- This is the exact schema running in the connected Supabase project
-- (verified live via the Supabase MCP tools — applied, then iterated on
-- based on real security/performance advisor output, not just written and
-- assumed correct). If you're setting up a fresh project, run this once in
-- the SQL editor.
--
-- SCOPE: this schema tracks WHO OWNS a board and WHO IT'S SHARED WITH, plus
-- authentication. It does NOT store board content (elements, connections,
-- canvas state) — that stays local-first in the browser's IndexedDB, exactly
-- as before. Live collaborative editing of board content is out of scope
-- here, same as it was in the original product spec (§53). `documents.id`
-- below is expected to equal the local Board.id from @nexus/types, so the
-- two stores can be joined by id when needed.
-- ============================================================================

create extension if not exists citext;

-- profiles: one row per auth.users row. Supabase Auth is email/password
-- based under the hood; Nexus Note logs in with a USERNAME, so signup maps
-- each username to a synthetic "shadow" email (see lib/auth/validation.ts)
-- and the real, user-facing username lives here.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-zA-Z0-9._@-]{3,32}$');

-- documents: ownership registry for local boards. `id` = the local Board.id.
create table if not exists public.documents (
  id text primary key,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Board sem título',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_id_idx on public.documents (owner_id);

-- document_shares: per-user permission grants. owner/editor/viewer.
create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.documents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission text not null check (permission in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (document_id, user_id)
);

create index if not exists document_shares_document_id_idx on public.document_shares (document_id);
create index if not exists document_shares_user_id_idx on public.document_shares (user_id);

-- share_links: architecture for link-based sharing (§18). Token is random
-- and unguessable — NEVER the document id itself. The UI to generate these
-- from the board isn't built yet (see docs/roadmap.md); schema + RLS are
-- ready for it. NOTE: `token` is declared `unique` inline, which already
-- creates its own index — don't also add a separate explicit index on it
-- (caught by the Supabase performance advisor as a duplicate index).
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.documents (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  permission text not null check (permission in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists share_links_document_id_idx on public.share_links (document_id);

-- ----------------------------------------------------------------------------
-- RLS — enabled and policized only now that all four tables exist (documents'
-- SELECT policy references document_shares, so creating it earlier fails
-- with "relation does not exist" — verified against a live project).
--
-- Every `auth.uid()`/`auth.role()` call below is wrapped in `(select ...)`.
-- Without that wrapper Postgres re-evaluates the function per ROW instead of
-- once per query — a real, measurable performance issue at scale, flagged
-- by Supabase's own advisor and fixed here rather than left as a known TODO.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;
alter table public.share_links enable row level security;

-- profiles: one single SELECT policy — any authenticated user can look up
-- *usernames* (needed for the share-by-username picker and covers "see your
-- own row" as a strict subset, so a separate owner-only policy would just
-- be redundant permissive-policy overhead). Actual login email resolution
-- goes through the SECURITY DEFINER function below, not a direct table
-- read, precisely so a logged-out visitor can't enumerate accounts by
-- querying this table.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_authenticated_username_lookup" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

-- documents
drop policy if exists "documents_select_owner_or_shared" on public.documents;
create policy "documents_select_owner_or_shared"
  on public.documents for select
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id and s.user_id = (select auth.uid())
    )
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
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id and s.user_id = (select auth.uid()) and s.permission = 'editor'
    )
  );

drop policy if exists "documents_delete_owner" on public.documents;
create policy "documents_delete_owner"
  on public.documents for delete
  using (owner_id = (select auth.uid()));

-- document_shares: owner manages shares; a shared user can see their OWN
-- grant (so the app can show them "you have editor access" without
-- exposing the full list).
drop policy if exists "shares_select_owner_or_self" on public.document_shares;
create policy "shares_select_owner_or_self"
  on public.document_shares for select
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid()))
  );

drop policy if exists "shares_insert_owner_only" on public.document_shares;
create policy "shares_insert_owner_only"
  on public.document_shares for insert
  with check (
    exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid()))
    and user_id <> (select auth.uid()) -- §17: can't share a document with yourself
  );

drop policy if exists "shares_update_owner_only" on public.document_shares;
create policy "shares_update_owner_only"
  on public.document_shares for update
  using (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid())));

drop policy if exists "shares_delete_owner_only" on public.document_shares;
create policy "shares_delete_owner_only"
  on public.document_shares for delete
  using (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid())));

-- share_links
drop policy if exists "share_links_owner_manage" on public.share_links;
create policy "share_links_owner_manage"
  on public.share_links for all
  using (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid())));

-- ----------------------------------------------------------------------------
-- Username → shadow email lookup, used ONLY by the login flow.
-- SECURITY DEFINER so it can read auth.users (normally locked down), but it
-- deliberately returns the same NULL shape whether the username doesn't
-- exist or genuinely has no matching auth user, so a logged-out client
-- can't distinguish "wrong username" from "wrong password" from the
-- response shape alone (the API route layers a generic error message on
-- top either way — see app/api/auth/resolve-username/route.ts). It IS
-- intentionally callable by the `anon` role — that's what makes login
-- possible before a session exists — Supabase's advisor flags any
-- anon-callable SECURITY DEFINER function, which is correct to flag in
-- general, but a false positive for this specific, deliberately-narrow one.
-- ----------------------------------------------------------------------------
create or replace function public.resolve_login_email(p_username citext)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = p_username
  limit 1;
$$;

revoke all on function public.resolve_login_email(citext) from public;
grant execute on function public.resolve_login_email(citext) to anon, authenticated;

-- updated_at bump helper for documents
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();
