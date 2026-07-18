-- Google Calendar OAuth tokens (access + refresh) for Calendar API.
-- Events are fetched live; nothing syncs into Postgres.

create table if not exists public.google_calendar_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expiry timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_tokens enable row level security;

create policy "google_calendar_tokens_select_own"
  on public.google_calendar_tokens for select
  using (auth.uid() = user_id);

create policy "google_calendar_tokens_insert_own"
  on public.google_calendar_tokens for insert
  with check (auth.uid() = user_id);

create policy "google_calendar_tokens_update_own"
  on public.google_calendar_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "google_calendar_tokens_delete_own"
  on public.google_calendar_tokens for delete
  using (auth.uid() = user_id);
