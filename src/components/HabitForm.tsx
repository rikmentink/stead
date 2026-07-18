import { useState, type FormEvent } from 'react'
import type { DayOfWeek, Habit, HabitFrequency } from '../types'
import { DAYS_OF_WEEK, DAY_LABELS } from '../lib/constants'

interface HabitFormProps {
  initial?: Partial<Habit>
  onSubmit: (values: {
    name: string
    category: string
    frequency: HabitFrequency
    days_of_week: DayOfWeek[]
    is_active: boolean
  }) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

export function HabitForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Add habit',
}: HabitFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [frequency, setFrequency] = useState<HabitFrequency>(
    initial?.frequency ?? 'daily',
  )
  const [days, setDays] = useState<DayOfWeek[]>(initial?.days_of_week ?? [])
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDay(day: DayOfWeek) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (frequency === 'weekly' && days.length === 0) {
      setError('Pick at least one day for weekly habits')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        category: category.trim(),
        frequency,
        days_of_week: frequency === 'weekly' ? days : [],
        is_active: isActive,
      })
      if (!initial) {
        setName('')
        setCategory('')
        setFrequency('daily')
        setDays([])
        setIsActive(true)
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
        <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="habit-name">
          Name
        </label>
        <input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          placeholder="e.g. Morning stretch"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="habit-cat">
          Category
        </label>
        <input
          id="habit-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          placeholder="Optional"
        />
      </div>
      <div>
        <span className="mb-1 block text-xs font-medium text-stone-600">Frequency</span>
        <div className="flex gap-2">
          {(['daily', 'weekly'] as HabitFrequency[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={[
                'rounded-md px-3 py-1.5 text-sm capitalize',
                frequency === f
                  ? 'bg-stone-900 text-white'
                  : 'border border-stone-300 text-stone-600 hover:bg-stone-50',
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {frequency === 'weekly' ? (
        <div>
          <span className="mb-1 block text-xs font-medium text-stone-600">Days</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={[
                  'rounded-md px-2 py-1 text-xs font-medium',
                  days.includes(day)
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-300 text-stone-600 hover:bg-stone-50',
                ].join(' ')}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-stone-300"
        />
        Active
      </label>
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
