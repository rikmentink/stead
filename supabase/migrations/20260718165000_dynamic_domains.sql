-- Dynamic domains: user-owned domain rows; tasks/habits keep free-text slug.

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, slug)
);

create index if not exists domains_user_active_idx
  on public.domains (user_id, sort_order)
  where archived_at is null;

alter table public.domains enable row level security;

create policy "domains_select_own"
  on public.domains for select
  using (auth.uid() = user_id);

create policy "domains_insert_own"
  on public.domains for insert
  with check (auth.uid() = user_id);

create policy "domains_update_own"
  on public.domains for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "domains_delete_own"
  on public.domains for delete
  using (auth.uid() = user_id);

-- Allow any slug on tasks/habits (app enforces membership via domains table)
alter table public.tasks drop constraint if exists tasks_domain_check;
alter table public.habits drop constraint if exists habits_domain_check;

-- Seed Personal + Work for every existing auth user
insert into public.domains (user_id, slug, name, sort_order)
select u.id, 'personal', 'Personal', 0
from auth.users u
where not exists (
  select 1 from public.domains d
  where d.user_id = u.id and d.slug = 'personal'
);

insert into public.domains (user_id, slug, name, sort_order)
select u.id, 'work', 'Work', 1
from auth.users u
where not exists (
  select 1 from public.domains d
  where d.user_id = u.id and d.slug = 'work'
);
