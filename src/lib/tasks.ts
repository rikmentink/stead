import type { Task, TaskStatus } from '../types'
import { MAX_PINNED_TASKS, TASK_STATUSES } from './constants'
import { getCurrentWeekDates, toDateString } from './dates'

export function getOpenPinnedCount(tasks: Task[]): number {
  return tasks.filter((t) => t.is_pinned && !t.completed && !t.archived_at)
    .length
}

export function canPinTask(tasks: Task[], task?: Task | null): boolean {
  if (task?.is_pinned) return true
  return getOpenPinnedCount(tasks) < MAX_PINNED_TASKS
}

export function getPinnedTasks(tasks: Task[], limit = MAX_PINNED_TASKS): Task[] {
  return sortTasks(
    tasks.filter((t) => t.is_pinned && !t.completed && !t.archived_at),
  ).slice(0, limit)
}

export function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.completed && !t.archived_at)
}

/** Compare nullable strings: non-empty alphabetical, empty/null last. */
function compareOptionalString(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const aEmpty = !a
  const bEmpty = !b
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1
  if (aEmpty) return 0
  return a!.localeCompare(b!, undefined, { sensitivity: 'base' })
}

/**
 * Stable UI priority:
 * 1. Pinned first
 * 2. Due date ascending (null/missing last)
 * 3. Category alphabetical (null/empty last)
 * 4. Title alphabetical
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1

  const aDue = a.due_date
  const bDue = b.due_date
  if (aDue !== bDue) {
    if (!aDue) return 1
    if (!bDue) return -1
    const dueCmp = aDue.localeCompare(bDue)
    if (dueCmp !== 0) return dueCmp
  }

  const catCmp = compareOptionalString(a.category, b.category)
  if (catCmp !== 0) return catCmp

  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasks)
}

export function getTasksByStatus(
  tasks: Task[],
  status: TaskStatus,
): Task[] {
  return sortTasks(
    getActiveTasks(tasks).filter((t) => (t.status ?? 'todo') === status),
  )
}

export function groupActiveTasksByStatus(
  tasks: Task[],
): Record<TaskStatus, Task[]> {
  const groups = Object.fromEntries(
    TASK_STATUSES.map((s) => [s, [] as Task[]]),
  ) as Record<TaskStatus, Task[]>

  for (const task of getActiveTasks(tasks)) {
    const status = TASK_STATUSES.includes(task.status)
      ? task.status
      : 'todo'
    groups[status].push(task)
  }

  for (const status of TASK_STATUSES) {
    groups[status] = sortTasks(groups[status])
  }

  return groups
}

export function getHistoryTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.completed && !t.archived_at)
    .sort((a, b) => {
      const aTime = a.completed_at ?? a.created_at
      const bTime = b.completed_at ?? b.created_at
      return bTime.localeCompare(aTime)
    })
}

export function getDueTodayCount(tasks: Task[], today = toDateString()): number {
  return getActiveTasks(tasks).filter((t) => t.due_date === today).length
}

export function getOverdueCount(tasks: Task[], today = toDateString()): number {
  return getActiveTasks(tasks).filter(
    (t) => t.due_date != null && t.due_date < today,
  ).length
}

/** Open tasks whose due_date falls in the current local Mon–Sun week. */
export function getDueThisWeekCount(
  tasks: Task[],
  date: Date = new Date(),
): number {
  const week = new Set(getCurrentWeekDates(date))
  return getActiveTasks(tasks).filter(
    (t) => t.due_date != null && week.has(t.due_date),
  ).length
}

/**
 * Soft text color for due dates.
 * Completed / missing / future → muted (never orange/red).
 */
export function getDueDateTextClass(
  dueDate: string | null | undefined,
  completed = false,
  today = toDateString(),
): string {
  if (!dueDate || completed) return 'text-stone-400'
  if (dueDate < today) return 'text-red-400'
  if (dueDate === today) return 'text-orange-400'
  return 'text-stone-400'
}

export function getInProgressCount(tasks: Task[]): number {
  return getActiveTasks(tasks).filter((t) => t.status === 'in_progress').length
}

/** Local calendar date of `completed_at` (ISO), or null if missing/invalid. */
function completedAtDate(task: Task): string | null {
  if (!task.completed_at) return null
  const d = new Date(task.completed_at)
  if (Number.isNaN(d.getTime())) return null
  return toDateString(d)
}

/**
 * Dashboard “Today’s tasks” membership:
 * - not soft-archived
 * - matches today criteria: pinned OR due_date ≤ today
 * - incomplete always included when matching
 * - completed only if completed_at’s local date is today (clears overnight)
 */
export function isDashboardTodayTask(
  task: Task,
  today = toDateString(),
): boolean {
  if (task.archived_at) return false
  const matchesToday =
    task.is_pinned || (task.due_date != null && task.due_date <= today)
  if (!matchesToday) return false
  if (!task.completed) return true
  return completedAtDate(task) === today
}

/**
 * Dashboard focus list: today criteria (open + completed today).
 * Sorted: incomplete first, then pinned → due date → category → title.
 */
export function getDashboardTasks(
  tasks: Task[],
  today = toDateString(),
): Task[] {
  return [...tasks.filter((t) => isDashboardTodayTask(t, today))].sort(
    (a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return compareTasks(a, b)
    },
  )
}
