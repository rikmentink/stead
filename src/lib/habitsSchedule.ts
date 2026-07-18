import type { Habit, HabitCompletion } from '../types'
import { getCurrentWeekDates, getDayOfWeek, toDateString } from './dates'
import { MAX_DASHBOARD_HABITS } from './constants'

/** True if habit is scheduled for the given local date (default: today). */
export function isHabitScheduledForToday(
  habit: Pick<Habit, 'frequency' | 'days_of_week' | 'is_active' | 'archived_at'>,
  date: Date = new Date(),
): boolean {
  if (!habit.is_active || habit.archived_at) return false

  if (habit.frequency === 'daily') return true

  const day = getDayOfWeek(date)
  const days = habit.days_of_week ?? []
  return days.includes(day)
}

export function getHabitsForToday(
  habits: Habit[],
  date: Date = new Date(),
): Habit[] {
  return habits.filter((h) => isHabitScheduledForToday(h, date))
}

export function getDashboardHabits(
  habits: Habit[],
  date: Date = new Date(),
  limit = MAX_DASHBOARD_HABITS,
): Habit[] {
  return getHabitsForToday(habits, date).slice(0, limit)
}

/** How many days this habit is scheduled in the current week. */
export function getScheduledDaysThisWeek(
  habit: Pick<Habit, 'frequency' | 'days_of_week'>,
): number {
  if (habit.frequency === 'daily') return 7
  return (habit.days_of_week ?? []).length
}

/** Completions in the current week (on any day). */
export function getWeekCompletionCount(
  habitId: string,
  completions: HabitCompletion[],
  date: Date = new Date(),
): number {
  const weekDates = new Set(getCurrentWeekDates(date))
  return completions.filter(
    (c) => c.habit_id === habitId && weekDates.has(c.completion_date),
  ).length
}

/** X/Y this week — Y is scheduled days (7 for daily, days_of_week length for weekly). */
export function formatWeekStreak(count: number, scheduledDays: number): string {
  const denom = Math.max(0, scheduledDays)
  return `${Math.min(count, denom)}/${denom}`
}

/** Simple consecutive-day streak ending today (or yesterday if not done today). */
export function getConsecutiveStreak(
  habitId: string,
  completions: HabitCompletion[],
  date: Date = new Date(),
): number {
  const dates = new Set(
    completions
      .filter((c) => c.habit_id === habitId)
      .map((c) => c.completion_date),
  )

  let cursor = new Date(date)
  let streak = 0

  // If today isn't complete, start from yesterday
  if (!dates.has(toDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (dates.has(toDateString(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function isCompletedOnDate(
  habitId: string,
  completions: HabitCompletion[],
  dateStr: string,
): boolean {
  return completions.some(
    (c) => c.habit_id === habitId && c.completion_date === dateStr,
  )
}
