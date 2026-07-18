import { Link } from 'react-router-dom'
import { useDomain } from '../hooks/useDomain'
import { useTasks } from '../hooks/useTasks'
import { useHabits } from '../hooks/useHabits'
import { CalendarTodayWidget } from '../components/CalendarTodayWidget'
import { TaskItem } from '../components/TaskItem'
import { HabitItem } from '../components/HabitItem'
import {
  ContentSkeleton,
  EmptyState,
  ErrorBanner,
  PageHeader,
} from '../components/ui'
import { formatDisplayDate, toDateString } from '../lib/dates'
import {
  getDashboardTasks,
  getDueThisWeekCount,
  getOverdueCount,
} from '../lib/tasks'
import { getHabitsForToday, isCompletedOnDate } from '../lib/habitsSchedule'
import type { Habit, Task } from '../types'

export function DashboardPage() {
  const { domain, domainLabel } = useDomain()
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    completeTask,
  } = useTasks(domain)
  const {
    habits,
    completions,
    loading: habitsLoading,
    error: habitsError,
    toggleCompletion,
  } = useHabits(domain)

  const loading = tasksLoading || habitsLoading
  const error = tasksError || habitsError

  const overdue = getOverdueCount(tasks)
  const dueThisWeek = getDueThisWeekCount(tasks)
  const dashboardTasks = getDashboardTasks(tasks)
  const openTodayCount = dashboardTasks.filter((t) => !t.completed).length
  const todayHabits = getHabitsForToday(habits)
  const today = toDateString()
  const habitsDoneToday = todayHabits.filter((h) =>
    isCompletedOnDate(h.id, completions, today),
  ).length
  const tasksAllDone =
    dashboardTasks.length > 0 && dashboardTasks.every((t) => t.completed)
  const habitsAllDone =
    todayHabits.length > 0 && habitsDoneToday === todayHabits.length

  async function handleComplete(task: Task) {
    try {
      await completeTask(task.id, !task.completed)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleToggleHabit(habit: Habit) {
    try {
      await toggleCompletion(habit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${domainLabel} · ${formatDisplayDate()}`}
      />

      {error ? <ErrorBanner message={error} /> : null}

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div>
          {loading ? (
            <ContentSkeleton rows={6} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard
                to="#todays-tasks"
                title="Tasks today"
                value={`${openTodayCount}`}
                detail={`${overdue} overdue, ${openTodayCount} remaining`}
              />
              <SummaryCard
                to="#todays-habits"
                title="Habits today"
                value={`${habitsDoneToday}/${todayHabits.length} done`}
                detail={
                  todayHabits.length === 0
                    ? 'No habits scheduled today'
                    : habitsDoneToday === todayHabits.length
                      ? 'All checked off'
                      : `${todayHabits.length - habitsDoneToday} remaining`
                }
              />
              <SummaryCard
                to="/tasks"
                title="All tasks"
                value={`${dueThisWeek} due this week`}
                detail="Open the board"
              />
            </div>
          )}
        </div>

        <div>
          <CalendarTodayWidget />
        </div>
      </div>

      {loading ? null : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section id="todays-tasks" className="scroll-mt-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                Today&apos;s tasks
                {tasksAllDone ? (
                  <span
                    className="text-xs font-normal text-amber-700/80"
                    title="All done"
                    aria-label="All done"
                  >
                    🏆
                  </span>
                ) : null}
              </h2>
              <Link
                to="/tasks"
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                Board
              </Link>
            </div>
            {dashboardTasks.length === 0 ? (
              <EmptyState message="No pinned, due today, or overdue tasks. Pin a focus or set a due date." />
            ) : (
              <ul className="rounded-lg border border-stone-200 bg-white px-4">
                {dashboardTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    showPin={false}
                    showStatusBadge
                    showOpenLink
                    to={`/tasks?task=${task.id}`}
                  />
                ))}
              </ul>
            )}
          </section>

          <section id="todays-habits" className="scroll-mt-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                Today&apos;s habits
                {habitsAllDone ? (
                  <span
                    className="text-xs font-normal text-amber-700/80"
                    title="All done"
                    aria-label="All done"
                  >
                    🏆
                  </span>
                ) : null}
              </h2>
              <Link
                to="/habits"
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                All habits
              </Link>
            </div>
            {todayHabits.length === 0 ? (
              <EmptyState message="No habits scheduled today." />
            ) : (
              <ul className="rounded-lg border border-stone-200 bg-white px-4">
                {todayHabits.map((habit) => (
                  <HabitItem
                    key={habit.id}
                    habit={habit}
                    completions={completions}
                    onToggle={handleToggleHabit}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  to,
  title,
  value,
  detail,
}: {
  to: string
  title: string
  value: string
  detail: string
}) {
  const isHash = to.startsWith('#')
  const className =
    'block rounded-lg border border-stone-200 bg-white px-4 py-4 transition-colors hover:border-stone-300 hover:bg-stone-50'

  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{detail}</p>
    </>
  )

  if (isHash) {
    return (
      <a href={to} className={className}>
        {body}
      </a>
    )
  }

  return (
    <Link to={to} className={className}>
      {body}
    </Link>
  )
}
