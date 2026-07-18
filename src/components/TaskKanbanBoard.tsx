import { useEffect, useRef, useState, type DragEvent } from 'react'
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../lib/constants'
import {
  canPinTask,
  getDueDateTextClass,
  groupActiveTasksByStatus,
} from '../lib/tasks'
import type { Task, TaskStatus } from '../types'

interface TaskKanbanBoardProps {
  tasks: Task[]
  focusTaskId?: string | null
  onFocusHandled?: () => void
  onComplete: (task: Task) => void
  onTogglePin: (task: Task) => void
  onEdit: (task: Task) => void
  onStatusChange: (task: Task, status: TaskStatus) => void
  onDueDateChange: (task: Task, dueDate: string | null) => void
}

export function TaskKanbanBoard({
  tasks,
  focusTaskId = null,
  onFocusHandled,
  onComplete,
  onTogglePin,
  onEdit,
  onStatusChange,
  onDueDateChange,
}: TaskKanbanBoardProps) {
  const grouped = groupActiveTasksByStatus(tasks)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const onFocusHandledRef = useRef(onFocusHandled)
  onFocusHandledRef.current = onFocusHandled

  useEffect(() => {
    if (!focusTaskId) return

    const scroll = window.setTimeout(() => {
      const el = document.getElementById(`task-card-${focusTaskId}`)
      el?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }, 50)

    setHighlightId(focusTaskId)
    const clearHighlight = window.setTimeout(() => {
      setHighlightId(null)
      onFocusHandledRef.current?.()
    }, 1600)

    return () => {
      window.clearTimeout(scroll)
      window.clearTimeout(clearHighlight)
    }
  }, [focusTaskId])

  function handleDragStart(e: DragEvent, task: Task) {
    e.dataTransfer.setData('text/task-id', task.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(task.id)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setOverStatus(null)
  }

  function handleDragOver(e: DragEvent, status: TaskStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overStatus !== status) setOverStatus(status)
  }

  function handleDrop(e: DragEvent, status: TaskStatus) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/task-id')
    setDraggingId(null)
    setOverStatus(null)
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    onStatusChange(task, status)
  }

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
      {TASK_STATUSES.map((status) => {
        const columnTasks = grouped[status]
        const isOver = overStatus === status
        return (
          <section
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={() => {
              if (overStatus === status) setOverStatus(null)
            }}
            onDrop={(e) => handleDrop(e, status)}
            className={[
              'flex w-72 shrink-0 flex-col rounded-lg border bg-stone-50',
              isOver ? 'border-stone-400' : 'border-stone-200',
            ].join(' ')}
          >
            <header className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-stone-800">
                {TASK_STATUS_LABELS[status]}
              </h3>
              <span className="text-xs text-stone-400">{columnTasks.length}</span>
            </header>
            <ul className="flex min-h-24 flex-1 flex-col gap-2 p-2">
              {columnTasks.length === 0 ? (
                <li className="px-1 py-6 text-center text-xs text-stone-400">
                  Drop tasks here
                </li>
              ) : (
                columnTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    dragging={draggingId === task.id}
                    highlighted={highlightId === task.id}
                    pinDisabled={!canPinTask(tasks, task)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onComplete={onComplete}
                    onTogglePin={onTogglePin}
                    onEdit={onEdit}
                    onDueDateChange={onDueDateChange}
                  />
                ))
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

interface KanbanCardProps {
  task: Task
  dragging: boolean
  highlighted: boolean
  pinDisabled: boolean
  onDragStart: (e: DragEvent, task: Task) => void
  onDragEnd: () => void
  onComplete: (task: Task) => void
  onTogglePin: (task: Task) => void
  onEdit: (task: Task) => void
  onDueDateChange: (task: Task, dueDate: string | null) => void
}

function KanbanCard({
  task,
  dragging,
  highlighted,
  pinDisabled,
  onDragStart,
  onDragEnd,
  onComplete,
  onTogglePin,
  onEdit,
  onDueDateChange,
}: KanbanCardProps) {
  return (
    <li
      id={`task-card-${task.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      className={[
        'cursor-grab rounded-md border bg-white p-3 shadow-sm transition-[box-shadow,border-color,background-color] duration-500 active:cursor-grabbing',
        dragging ? 'opacity-50' : '',
        highlighted
          ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
          : 'border-stone-200',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onComplete(task)}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-stone-300 bg-white hover:border-stone-500"
          aria-label="Mark complete"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-900">{task.title}</p>
          {task.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
              {task.description}
            </p>
          ) : null}
          {task.category ? (
            <p className="mt-1 text-xs text-stone-400">{task.category}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onTogglePin(task)}
          disabled={!task.is_pinned && pinDisabled}
          className={[
            'shrink-0 rounded px-1 py-0.5 text-sm disabled:cursor-not-allowed disabled:opacity-40',
            task.is_pinned
              ? 'text-amber-600 hover:bg-amber-50'
              : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600',
          ].join(' ')}
          title={task.is_pinned ? 'Unpin' : 'Pin'}
          aria-label={task.is_pinned ? 'Unpin' : 'Pin'}
        >
          {task.is_pinned ? '★' : '☆'}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="date"
          value={task.due_date ?? ''}
          onChange={(e) => onDueDateChange(task, e.target.value || null)}
          className={[
            'min-w-0 flex-1 rounded border border-stone-200 bg-stone-50 px-1.5 py-1 text-xs outline-none focus:border-stone-400',
            getDueDateTextClass(task.due_date, task.completed),
          ].join(' ')}
          aria-label="Due date"
        />
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="shrink-0 rounded px-1.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
        >
          Edit
        </button>
      </div>
    </li>
  )
}
