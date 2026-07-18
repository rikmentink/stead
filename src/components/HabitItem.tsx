import type { Habit, HabitCompletion } from '../types'
import {
  formatWeekStreak,
  getConsecutiveStreak,
  getScheduledDaysThisWeek,
  getWeekCompletionCount,
  isCompletedOnDate,
} from '../lib/habitsSchedule'
import { toDateString } from '../lib/dates'
import { DAY_LABELS } from '../lib/constants'

interface HabitItemProps {
  habit: Habit
  completions: HabitCompletion[]
  onToggle: (habit: Habit) => void
  onArchive?: (habit: Habit) => void
  onEdit?: (habit: Habit) => void
  showSchedule?: boolean
}

export function HabitItem({
  habit,
  completions,
  onToggle,
  onArchive,
  onEdit,
  showSchedule,
}: HabitItemProps) {
  const today = toDateString()
  const done = isCompletedOnDate(habit.id, completions, today)
  const weekCount = getWeekCompletionCount(habit.id, completions)
  const scheduledDays = getScheduledDaysThisWeek(habit)
  const streak = getConsecutiveStreak(habit.id, completions)

  return (
    <li className="flex items-start gap-3 border-b border-stone-100 py-3 last:border-0">
      <button
        type="button"
        onClick={() => onToggle(habit)}
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
          done
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-stone-300 bg-white hover:border-stone-500',
        ].join(' ')}
        aria-label={done ? 'Uncheck habit' : 'Check habit'}
      >
        {done ? (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2.5 6.5L5 9l4.5-5.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900">{habit.name}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-400">
          <span>{formatWeekStreak(weekCount, scheduledDays)} this week</span>
          {streak > 0 ? (
            <span className="text-amber-700/80">
              🏆 {streak} day streak
            </span>
          ) : null}
          {habit.category ? <span>{habit.category}</span> : null}
          {showSchedule ? (
            <span>
              {habit.frequency === 'daily'
                ? 'Daily'
                : (habit.days_of_week ?? [])
                    .map((d) => DAY_LABELS[d])
                    .join(', ')}
            </span>
          ) : null}
          {!habit.is_active ? <span className="text-amber-700">Paused</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(habit)}
            className="rounded px-1.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
          >
            Edit
          </button>
        ) : null}
        {onArchive ? (
          <button
            type="button"
            onClick={() => onArchive(habit)}
            className="rounded px-1.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
          >
            Archive
          </button>
        ) : null}
      </div>
    </li>
  )
}
