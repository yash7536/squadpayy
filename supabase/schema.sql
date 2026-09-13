-- ============================================================================
-- SquadPay V2 — complete database schema
-- ============================================================================
-- Run this ONCE in a new Supabase project to enable real persistence for
-- contacts, splits, line items, item assignments, payment status, and
-- activity. Without it, the app automatically falls back to a local-only
-- demo store (see lib/data/store-context.tsx) — nothing breaks if you skip
-- this, but nothing is saved to a real database either.
--
-- Everything below is scoped to the signed-in user via Row Level Security
-- (auth.uid()). No service-role key is required or used by the app itself.
--
-- Safe to re-run: every statement is idempotent (CREATE ... IF NOT EXISTS /
-- DROP POLICY IF EXISTS before each CREATE POLICY), so running this twice on
-- the same project won't error.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto. Supabase projects usually have it on
-- already, but this makes the script self-contained on a bare project too.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- "Friends" a user has added. A friend does NOT need their own SquadPay
-- account — they're just a name the owner tracks splits against.
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists splits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- Client-generated UUID, set once when a split is first created (locally
  -- or while already signed in) and never regenerated. This is what makes
  -- pushing a split to Supabase idempotent: retrying the same push (a flaky
  -- network, a refresh mid-sync, a second sync attempt) re-sends the same
  -- client_id and upserts the same row instead of creating a duplicate. See
  -- the unique index below. Nullable only so the column can be added to an
  -- existing table without backfilling; every split the app creates from
  -- here on always sets it.
  client_id uuid,
  title text not null,
  merchant text,
  merchant_location text,
  bill_date date not null default current_date,
  subtotal numeric not null default 0,
  tax_and_service numeric not null default 0,
  total numeric not null default 0,
  split_mode text not null check (split_mode in ('item', 'equal')),
  -- NULL payer_contact_id means the signed-in owner fronted the bill.
  payer_contact_id uuid references contacts(id) on delete set null,
  created_at timestamptz not null default now()
);
-- A plain (non-partial) unique index — deliberately, not
-- `where client_id is not null`. Standard SQL never treats two NULLs as
-- equal in a unique index, so this already allows unlimited legacy rows
-- with client_id IS NULL without any predicate; the reason to avoid a
-- partial index here is stricter than that quirk being merely unnecessary —
-- PostgREST's `.upsert(..., { onConflict })` emits a plain
-- `ON CONFLICT (owner_id, client_id)` with no WHERE clause, which Postgres
-- will only match against a full unique index, not a partial one.
create unique index if not exists splits_owner_client_unique
  on splits (owner_id, client_id);

create table if not exists split_items (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  name text not null,
  quantity int not null default 1,
  amount numeric not null,
  category text,
  icon text,
  position int not null default 0
);
-- Needed so a retried/partial sync can upsert line items instead of either
-- duplicating them or failing outright on a plain re-insert.
create unique index if not exists split_items_unique
  on split_items (split_id, position);

-- Who's in a given split. NULL contact_id + is_self = true is the owner.
create table if not exists split_participants (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  is_self boolean not null default false,
  constraint split_participants_identity check (
    (is_self and contact_id is null) or (not is_self and contact_id is not null)
  )
);
create unique index if not exists split_participants_unique
  on split_participants (split_id, coalesce(contact_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Who claimed how much of a line item. shared = true divides the item's
-- amount evenly across every row with shared = true for that item;
-- shared = false uses `units` out of the item's total quantity instead.
create table if not exists item_assignments (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  item_id uuid not null references split_items(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  is_self boolean not null default false,
  shared boolean not null default true,
  units numeric not null default 1,
  constraint item_assignments_identity check (
    (is_self and contact_id is null) or (not is_self and contact_id is not null)
  )
);
create unique index if not exists item_assignments_unique
  on item_assignments (item_id, coalesce(contact_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists payment_status (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  is_self boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'reminder_sent', 'paid')),
  updated_at timestamptz not null default now(),
  constraint payment_status_identity check (
    (is_self and contact_id is null) or (not is_self and contact_id is not null)
  )
);
create unique index if not exists payment_status_unique
  on payment_status (split_id, coalesce(contact_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  split_id uuid references splits(id) on delete cascade,
  type text not null check (type in ('viewed', 'paid', 'created', 'settled', 'nudged')),
  actor_name text not null,
  detail text not null,
  amount numeric,
  created_at timestamptz not null default now()
);

-- Helpful indexes for the app's actual query patterns (fetch-by-owner,
-- fetch-by-split).
create index if not exists contacts_owner_idx on contacts (owner_id);
create index if not exists splits_owner_idx on splits (owner_id, created_at desc);
create index if not exists split_items_split_idx on split_items (split_id, position);
create index if not exists split_participants_split_idx on split_participants (split_id);
create index if not exists item_assignments_split_idx on item_assignments (split_id);
create index if not exists item_assignments_item_idx on item_assignments (item_id);
create index if not exists payment_status_split_idx on payment_status (split_id);
create index if not exists activity_events_owner_idx on activity_events (owner_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security: every table is scoped to auth.uid(). A signed-in user
-- can only ever see or touch their own rows — no service-role key needed.
-- ----------------------------------------------------------------------------

alter table contacts enable row level security;
alter table splits enable row level security;
alter table split_items enable row level security;
alter table split_participants enable row level security;
alter table item_assignments enable row level security;
alter table payment_status enable row level security;
alter table activity_events enable row level security;

drop policy if exists "own contacts" on contacts;
create policy "own contacts" on contacts for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own splits" on splits;
create policy "own splits" on splits for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own activity" on activity_events;
create policy "own activity" on activity_events for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own split items" on split_items;
create policy "own split items" on split_items for all
  using (exists (select 1 from splits where splits.id = split_items.split_id and splits.owner_id = auth.uid()))
  with check (exists (select 1 from splits where splits.id = split_items.split_id and splits.owner_id = auth.uid()));

drop policy if exists "own split participants" on split_participants;
create policy "own split participants" on split_participants for all
  using (exists (select 1 from splits where splits.id = split_participants.split_id and splits.owner_id = auth.uid()))
  with check (exists (select 1 from splits where splits.id = split_participants.split_id and splits.owner_id = auth.uid()));

drop policy if exists "own item assignments" on item_assignments;
create policy "own item assignments" on item_assignments for all
  using (exists (select 1 from splits where splits.id = item_assignments.split_id and splits.owner_id = auth.uid()))
  with check (exists (select 1 from splits where splits.id = item_assignments.split_id and splits.owner_id = auth.uid()));

drop policy if exists "own payment status" on payment_status;
create policy "own payment status" on payment_status for all
  using (exists (select 1 from splits where splits.id = payment_status.split_id and splits.owner_id = auth.uid()))
  with check (exists (select 1 from splits where splits.id = payment_status.split_id and splits.owner_id = auth.uid()));

-- ============================================================================
-- Done. Sanity check: run this and expect all 7 rows with rowsecurity = true.
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public'
--   order by tablename;
-- ============================================================================
