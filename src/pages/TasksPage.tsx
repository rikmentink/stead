import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDomain } from '../hooks/useDomain'
import { useTasks } from '../hooks/useTasks'
import { TaskForm } from '../components/TaskForm'
import { TaskKanbanBoard } from '../components/TaskKanbanBoard'
import {
  ContentSkeleton,
  EmptyState,
  ErrorBanner,
  PageHeader,
} from '../components/ui'
import { getActiveTasks } from '../lib/tasks'
import type { Task, TaskStatus } from '../types'

export function TasksPage() {
  const { domain, domainLabel } = useDomain()
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    completeTask,
    togglePin,
  } = useTasks(domain)
  const [searchParams, setSearchParams] = useSearchParams()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)

  const active = getActiveTasks(tasks)

  useEffect(() => {
    const taskId = searchParams.get('task')
    if (!taskId || loading) return

    setSearchParams(
      (prev) => {
        if (!prev.has('task')) return prev
        const next = new URLSearchParams(prev)
        next.delete('task')
        return next
      },
      { replace: true },
    )

    const found = getActiveTasks(tasks).find((t) => t.id === taskId)
    if (!found) return

    setFocusTaskId(found.id)
  }, [loading, tasks, searchParams, setSearchParams])

  async function handleCreate(values: {
    title: string
    description: string
    category: string
    due_date: string
  }) {
    await createTask({
      title: values.title,
      description: values.description || null,
      category: values.category || null,
      due_date: values.due_date || null,
      status: 'todo',
    })
    setShowForm(false)
  }

  async function handleUpdate(values: {
    title: string
    description: string
    category: string
    due_date: string
  }) {
    if (!editing) return
    await updateTask(editing.id, {
      title: values.title,
      description: values.description || null,
      category: values.category || null,
      due_date: values.due_date || null,
    })
    setEditing(null)
  }

  async function handleComplete(task: Task) {
    try {
      await completeTask(task.id, true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handlePin(task: Task) {
    try {
      await togglePin(task)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    try {
      await updateTask(task.id, { status })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleDueDateChange(task: Task, dueDate: string | null) {
    try {
      await updateTask(task.id, { due_date: dueDate })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${domainLabel} · kanban`}
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setShowForm((v) => !v)
            }}
            className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            {showForm ? 'Close' : 'New task'}
          </button>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {showForm && !editing ? (
        <div className="mb-6">
          <TaskForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      ) : null}

      {editing ? (
        <div className="mb-6">
          <TaskForm
            initial={editing}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {loading ? (
        <ContentSkeleton rows={4} />
      ) : active.length === 0 ? (
        <EmptyState message="No open tasks. Add one to get started." />
      ) : (
        <TaskKanbanBoard
          tasks={tasks}
          focusTaskId={focusTaskId}
          onFocusHandled={() => setFocusTaskId(null)}
          onComplete={handleComplete}
          onTogglePin={handlePin}
          onEdit={setEditing}
          onStatusChange={handleStatusChange}
          onDueDateChange={handleDueDateChange}
        />
      )}
    </div>
  )
}
