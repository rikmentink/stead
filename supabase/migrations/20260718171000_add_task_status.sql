-- Kanban workflow status for open tasks.
-- Completed/archived tasks are filtered out of the board in the app;
-- status may remain as last workflow column.

alter table public.tasks
  add column if not exists status text not null default 'todo';

alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('todo', 'in_progress', 'waiting'));

update public.tasks
set status = 'todo'
where completed = false;
