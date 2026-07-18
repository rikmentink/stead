import { Link } from 'react-router-dom'
import type { Task, TaskStatus } from '../types'
import { formatShortDate } from '../lib/dates'
import { TASK_STATUS_LABELS } from '../lib/constants'
import { getDueDateTextClass } from '../lib/tasks'

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  todo: 'bg-stone-100 text-stone-600',
  in_progress: 'bg-blue-100 text-blue-700',
  waiting: 'bg-orange-100 text-orange-700',
}

interface TaskItemProps {
  task: Task
  onComplete: (task: Task) => void
  onTogglePin?: (task: Task) => void
  onArchive?: (task: Task) => void
  onEdit?: (task: Task) => void
  pinDisabled?: boolean
  /** When false, hides the pin control even if onTogglePin is provided. */
  showPin?: boolean
  /** Compact status pill next to the title (e.g. Dashboard today’s tasks). */
  showStatusBadge?: boolean
  /** Chevron link to open the task on the Tasks board (Dashboard). */
  showOpenLink?: boolean
  /** Override destination; defaults to `/tasks?task=<id>`. */
  to?: string
  onOpen?: (task: Task) => void
  meta?: string
}

export function TaskItem({
  task,
  onComplete,
  onTogglePin,
  onArchive,
  onEdit,
  pinDisabled,
  showPin = true,
  showStatusBadge = false,
  showOpenLink = false,
  to,
  onOpen,
  meta,
}: TaskItemProps) {
  const status = task.status ?? 'todo'
  const badge = showStatusBadge
    ? task.completed
      ? { label: 'Done', className: 'bg-emerald-100 text-emerald-700' }
      : {
          label: TASK_STATUS_LABELS[status],
          className: STATUS_BADGE_CLASSES[status],
        }
    : null

  return (
    <li className="flex items-start gap-3 border-b border-stone-100 py-3 last:border-0">
      <button
        type="button"
        onClick={() => onComplete(task)}
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
          task.completed
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-stone-300 bg-white hover:border-stone-500',
        ].join(' ')}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed ? (
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
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={[
              'text-sm font-medium text-stone-900',
              task.completed ? 'line-through text-stone-400' : '',
            ].join(' ')}
          >
            {task.title}
          </p>
          {badge ? (
            <span
              className={[
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
                badge.className,
              ].join(' ')}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
        {task.description ? (
          <p className="mt-0.5 text-xs text-stone-500">{task.description}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-400">
          {task.category ? <span>{task.category}</span> : null}
          {task.due_date ? (
            <span className={getDueDateTextClass(task.due_date, task.completed)}>
              Due {formatShortDate(task.due_date)}
            </span>
          ) : null}
          {task.is_pinned ? <span className="text-amber-700">Pinned</span> : null}
          {meta ? <span>{meta}</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {showPin && onTogglePin && !task.completed ? (
          <button
            type="button"
            onClick={() => onTogglePin(task)}
            disabled={!task.is_pinned && pinDisabled}
            className="rounded px-1.5 py-1 text-xs text-stone-500 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
            title={task.is_pinned ? 'Unpin' : 'Pin'}
          >
            {task.is_pinned ? 'Unpin' : 'Pin'}
          </button>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="rounded px-1.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
          >
            Edit
          </button>
        ) : null}
        {onArchive ? (
          <button
            type="button"
            onClick={() => onArchive(task)}
            className="rounded px-1.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
          >
            Archive
          </button>
        ) : null}
        {showOpenLink ? (
          onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="rounded px-1.5 py-1 text-sm leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              title="Open on board"
              aria-label="Open on board"
            >
              →
            </button>
          ) : (
            <Link
              to={to ?? `/tasks?task=${task.id}`}
              className="rounded px-1.5 py-1 text-sm leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              title="Open on board"
              aria-label="Open on board"
            >
              →
            </Link>
          )
        ) : null}
      </div>
    </li>
  )
}
