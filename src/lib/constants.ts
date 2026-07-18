import type { DayOfWeek, TaskStatus } from '../types'

export const MAX_PINNED_TASKS = 3
export const MAX_DASHBOARD_HABITS = 3

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'waiting']

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  waiting: 'Waiting',
}

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
]

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
}

export const APP_NAME = 'Stead'

export const DOMAIN_STORAGE_KEY = 'stead:domain'

export const DEFAULT_DOMAINS = [
  { slug: 'personal', name: 'Personal', sort_order: 0 },
  { slug: 'work', name: 'Work', sort_order: 1 },
] as const

/** Turn a display name into a URL-safe slug. */
export function slugifyDomain(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'domain'
}

/** Pick a unique slug given existing ones (appends -2, -3, …). */
export function uniqueDomainSlug(
  name: string,
  existingSlugs: Iterable<string>,
): string {
  const taken = new Set(existingSlugs)
  const base = slugifyDomain(name)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
