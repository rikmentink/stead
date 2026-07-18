import { useState, type FormEvent } from 'react'
import type { Task } from '../types'

interface TaskFormProps {
  initial?: Partial<Task>
  onSubmit: (values: {
    title: string
    description: string
    category: string
    due_date: string
  }) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

export function TaskForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Add task',
}: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        due_date: dueDate || '',
      })
      if (!initial) {
        setTitle('')
        setDescription('')
        setCategory('')
        setDueDate('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="task-title">
          Title
        </label>
        <input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          placeholder="What needs doing?"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="task-desc">
          Description
        </label>
        <textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          placeholder="Optional notes"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="task-cat">
            Category
          </label>
          <input
            id="task-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            placeholder="e.g. Admin"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="task-due">
            Due date
          </label>
          <input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
        </div>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
