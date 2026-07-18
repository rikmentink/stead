import { useState } from 'react'
import { useDomain } from '../hooks/useDomain'
import { useHabits } from '../hooks/useHabits'
import { HabitItem } from '../components/HabitItem'
import { HabitForm } from '../components/HabitForm'
import {
  ContentSkeleton,
  EmptyState,
  ErrorBanner,
  PageHeader,
} from '../components/ui'
import { getHabitsForToday } from '../lib/habitsSchedule'
import type { DayOfWeek, Habit, HabitFrequency } from '../types'

export function HabitsPage() {
  const { domain, domainLabel } = useDomain()
  const {
    habits,
    completions,
    loading,
    error,
    createHabit,
    updateHabit,
    archiveHabit,
    toggleCompletion,
  } = useHabits(domain)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)

  const todayHabits = getHabitsForToday(habits)
  const otherHabits = habits.filter((h) => !todayHabits.includes(h))

  async function handleCreate(values: {
    name: string
    category: string
    frequency: HabitFrequency
    days_of_week: DayOfWeek[]
    is_active: boolean
  }) {
    await createHabit({
      name: values.name,
      category: values.category || null,
      frequency: values.frequency,
      days_of_week: values.days_of_week,
      is_active: values.is_active,
    })
    setShowForm(false)
  }

  async function handleUpdate(values: {
    name: string
    category: string
    frequency: HabitFrequency
    days_of_week: DayOfWeek[]
    is_active: boolean
  }) {
    if (!editing) return
    await updateHabit(editing.id, {
      name: values.name,
      category: values.category || null,
      frequency: values.frequency,
      days_of_week: values.frequency === 'weekly' ? values.days_of_week : null,
      is_active: values.is_active,
    })
    setEditing(null)
  }

  async function handleToggle(habit: Habit) {
    try {
      await toggleCompletion(habit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleArchive(habit: Habit) {
    try {
      await archiveHabit(habit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div>
      <PageHeader
        title="All Habits"
        subtitle={`${domainLabel} · schedule & streaks`}
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setShowForm((v) => !v)
            }}
            className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            {showForm ? 'Close' : 'New habit'}
          </button>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {showForm && !editing ? (
        <div className="mb-6">
          <HabitForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      ) : null}

      {editing ? (
        <div className="mb-6">
          <HabitForm
            initial={editing}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {loading ? (
        <ContentSkeleton rows={4} />
      ) : habits.length === 0 ? (
        <EmptyState message="No habits yet. Add a daily or weekly habit." />
      ) : (
        <>
          {todayHabits.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-stone-800">
                Scheduled today
              </h2>
              <ul className="rounded-lg border border-stone-200 bg-white px-4">
                {todayHabits.map((habit) => (
                  <HabitItem
                    key={habit.id}
                    habit={habit}
                    completions={completions}
                    onToggle={handleToggle}
                    onArchive={handleArchive}
                    onEdit={setEditing}
                    showSchedule
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {otherHabits.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-stone-800">
                Other habits
              </h2>
              <ul className="rounded-lg border border-stone-200 bg-white px-4">
                {otherHabits.map((habit) => (
                  <HabitItem
                    key={habit.id}
                    habit={habit}
                    completions={completions}
                    onToggle={handleToggle}
                    onArchive={handleArchive}
                    onEdit={setEditing}
                    showSchedule
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
