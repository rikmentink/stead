import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  isValid,
  isToday,
  isYesterday,
  isTomorrow,
} from 'date-fns'
import type { DayOfWeek } from '../types'

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
}

/** Local calendar date as YYYY-MM-DD */
export function toDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDateString(value: string): Date | null {
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

export function getDayOfWeek(date: Date = new Date()): DayOfWeek {
  return DAY_MAP[date.getDay()]
}

export function formatDisplayDate(date: Date = new Date()): string {
  return format(date, 'EEEE, MMM d')
}

/**
 * Human-readable date: yesterday / today / tomorrow, else short date
 * without year (unless the year differs from the current year).
 */
export function formatShortDate(value: string | null): string {
  if (!value) return ''
  const parsed = parseDateString(value)
  if (!parsed) return value
  if (isYesterday(parsed)) return 'yesterday'
  if (isToday(parsed)) return 'today'
  if (isTomorrow(parsed)) return 'tomorrow'
  const now = new Date()
  return parsed.getFullYear() === now.getFullYear()
    ? format(parsed, 'd MMM')
    : format(parsed, 'd MMM yyyy')
}

/** Monday-start week date strings (local) */
export function getCurrentWeekDates(date: Date = new Date()): string[] {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end }).map((d) => toDateString(d))
}
