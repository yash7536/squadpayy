-- SquadPay database schema
-- Run this in your Supabase project's SQL editor (Database -> SQL Editor -> New query).
--
-- Notes for a beginner reading this later:
-- - "auth.users" is a table Supabase's built-in Auth system already manages
--   for us. We don't create a separate users table — we just reference
--   auth.users.id for whoever is signed in (the sender).
-- - Every table has Row Level Security (RLS) turned on, and every policy
--   below is "owner only" — a signed-in sender can only see/edit their OWN
--   bills, people, splits, and payment requests.
-- - Important: RLS policies can only look at a row's DATA, not at "what
--   token the visitor typed into the URL". So we deliberately do NOT add an
--   "anyone can read this if they have the token" policy here — a using
--   (true) policy would let anyone read/edit EVERY row in the table, not
--   just the one matching their link. Instead, the public "/pay/[token]"
--   page is served by trusted server-side code (a Next.js server route)
--   using the private service role key, which checks the token match in
--   plain code before returning anything. See lib/supabaseAdmin.js
--   (added when we build that screen) — it is never exposed to the browser.

-- ============================================================
-- bills
-- One row per bill the sender creates (matches "Add Bill" / "Review Bill").
-- ============================================================
create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  receipt_photo_url text, -- optional, from the "Reading Receipt" screen
  created_at timestamptz not null default now()
);

alter table bills enable row level security;

create policy "Owners can manage their own bills"
  on bills
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================
-- people
-- The contacts a sender splits a bill with (matches "Add People").
-- Recipients never log in, so this is just a name + optional contact info
-- the sender enters themselves.
-- ============================================================
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  contact_info text, -- optional phone/email, just for the sender's reference
  created_at timestamptz not null default now()
);

alter table people enable row level security;

create policy "Owners can manage their own contacts"
  on people
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================
-- splits
-- One row per person's share of a bill (matches "Split Bill").
-- status starts "pending" and flips to "paid" when the recipient
-- self-reports on their payment link (matches "Payment Status" /
-- "Payment Complete").
-- ============================================================
create table if not exists splits (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  amount_owed numeric(10, 2) not null check (amount_owed >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now()
);

alter table splits enable row level security;

-- Splits don't store owner_id directly, so we check ownership through the
-- parent bill.
create policy "Owners can manage splits on their own bills"
  on splits
  for all
  using (
    exists (
      select 1 from bills
      where bills.id = splits.bill_id
        and bills.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from bills
      where bills.id = splits.bill_id
        and bills.owner_id = auth.uid()
    )
  );

-- ============================================================
-- payment_requests
-- One row per shareable link (matches "Review & Send" / "Payment Reminder").
-- The "token" is a random, unguessable id used in the public URL, e.g.
-- squadpay.app/pay/<token> — this is how a recipient can view and update
-- their own payment status without ever creating an account.
-- ============================================================
create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  message text, -- the friendly reminder text generated for the sender to share
  created_at timestamptz not null default now(),
  -- Set when the sender taps "Remind me later" on Payment Reminder — a
  -- truthful record of the last time they acknowledged this request, NOT
  -- a scheduled future reminder (there is no scheduler/cron/notification
  -- service in this app). Nullable: most requests have never been
  -- "remind later"'d. See lib/paymentRequestsDb.js's markReminderSent.
  last_reminded_at timestamptz
);

alter table payment_requests enable row level security;

-- The sender can manage requests for their own bills, same pattern as splits.
create policy "Owners can manage payment requests on their own bills"
  on payment_requests
  for all
  using (
    exists (
      select 1 from splits
      join bills on bills.id = splits.bill_id
      where splits.id = payment_requests.split_id
        and bills.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from splits
      join bills on bills.id = splits.bill_id
      where splits.id = payment_requests.split_id
        and bills.owner_id = auth.uid()
    )
  );

-- No public/anon policies on payment_requests or splits — see the note at
-- the top of this file. The recipient's "/pay/[token]" page and its
-- "Mark as Paid" action are handled by a trusted server route using the
-- service role key, which bypasses RLS deliberately and safely because the
-- token-matching check happens in our own server code, not in the browser.
