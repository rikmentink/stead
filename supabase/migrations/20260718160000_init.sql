-- Lean Productivity Dashboard schema
-- Soft-delete via archived_at; pin max-3 and today-habits are app rules.

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  is_pinned boolean not null default false,
  completed boolean not null default false,
  completed_at timestamptz,
  due_date date,
  domain text not null check (domain in ('personal', 'work')),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists tasks_user_domain_idx
  on public.tasks (user_id, domain)
  where archived_at is null;

-- Habits
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text,
  frequency text not null check (frequency in ('daily', 'weekly')),
  days_of_week text[],
  domain text not null check (domain in ('personal', 'work')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists habits_user_domain_idx
  on public.habits (user_id, domain)
  where archived_at is null;

-- Habit completions (upsert on check-off)
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  completion_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, completion_date)
);

create index if not exists habit_completions_user_habit_idx
  on public.habit_completions (user_id, habit_id, completion_date);

-- RLS
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

-- Tasks policies
create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Habits policies
create policy "habits_select_own"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "habits_insert_own"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "habits_update_own"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "habits_delete_own"
  on public.habits for delete
  using (auth.uid() = user_id);

-- Habit completions policies
create policy "habit_completions_select_own"
  on public.habit_completions for select
  using (auth.uid() = user_id);

create policy "habit_completions_insert_own"
  on public.habit_completions for insert
  with check (auth.uid() = user_id);

create policy "habit_completions_update_own"
  on public.habit_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "habit_completions_delete_own"
  on public.habit_completions for delete
  using (auth.uid() = user_id);
