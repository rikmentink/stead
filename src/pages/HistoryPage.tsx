import { useDomain } from '../hooks/useDomain'
import { useTasks } from '../hooks/useTasks'
import { TaskItem } from '../components/TaskItem'
import {
  ContentSkeleton,
  EmptyState,
  ErrorBanner,
  PageHeader,
} from '../components/ui'
import { getHistoryTasks } from '../lib/tasks'
import { formatShortDate } from '../lib/dates'
import type { Task } from '../types'

export function HistoryPage() {
  const { domain, domainLabel } = useDomain()
  const { tasks, loading, error, completeTask, archiveTask, togglePin } =
    useTasks(domain)

  const history = getHistoryTasks(tasks)

  async function handleComplete(task: Task) {
    try {
      await completeTask(task.id, !task.completed)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleArchive(task: Task) {
    try {
      await archiveTask(task.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div>
      <PageHeader
        title="History"
        subtitle={`${domainLabel} · completed tasks`}
      />

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <ContentSkeleton rows={4} />
      ) : history.length === 0 ? (
        <EmptyState message="No completed tasks yet." />
      ) : (
        <ul className="rounded-lg border border-stone-200 bg-white px-4">
          {history.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onTogglePin={togglePin}
              onArchive={handleArchive}
              meta={
                task.completed_at
                  ? `Completed ${formatShortDate(task.completed_at.slice(0, 10))}`
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
