import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toDateString } from '../lib/dates'
import type {
  DomainSlug,
  Habit,
  HabitCompletion,
  HabitInsert,
  HabitUpdate,
} from '../types'
import { useAuth } from './useAuth'
import { usePollingRefresh } from './useRefetch'

export function useHabits(domain: DomainSlug) {
  const { user } = useAuth()
  const userId = user?.id
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    hasLoadedRef.current = false
    setLoading(true)
  }, [userId, domain])

  const fetchAll = useCallback(async () => {
    if (!userId) {
      setHabits([])
      setCompletions([])
      hasLoadedRef.current = true
      setLoading(false)
      return
    }

    const isInitial = !hasLoadedRef.current
    if (isInitial) setLoading(true)
    setError(null)

    const [habitsRes, completionsRes] = await Promise.all([
      supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('domain', domain)
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', userId)
        .gte(
          'completion_date',
          toDateString(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
        )
        .order('completion_date', { ascending: false }),
    ])

    if (habitsRes.error) {
      setError(habitsRes.error.message)
      if (isInitial) {
        hasLoadedRef.current = true
        setLoading(false)
      }
      return
    }
    if (completionsRes.error) {
      setError(completionsRes.error.message)
      if (isInitial) {
        hasLoadedRef.current = true
        setLoading(false)
      }
      return
    }

    setHabits((habitsRes.data as Habit[]) ?? [])
    setCompletions((completionsRes.data as HabitCompletion[]) ?? [])
    hasLoadedRef.current = true
    setLoading(false)
  }, [userId, domain])

  usePollingRefresh(fetchAll)

  const createHabit = useCallback(
    async (input: Omit<HabitInsert, 'domain'> & { domain?: DomainSlug }) => {
      if (!user) throw new Error('Not signed in')

      const payload = {
        name: input.name,
        category: input.category ?? null,
        frequency: input.frequency,
        days_of_week:
          input.frequency === 'weekly' ? (input.days_of_week ?? []) : null,
        domain: input.domain ?? domain,
        is_active: input.is_active ?? true,
        user_id: user.id,
      }

      const { data, error: insertError } = await supabase
        .from('habits')
        .insert(payload)
        .select()
        .single()

      if (insertError) throw insertError
      setHabits((prev) => [data as Habit, ...prev])
      return data as Habit
    },
    [user, domain],
  )

  const updateHabit = useCallback(async (id: string, updates: HabitUpdate) => {
    const { data, error: updateError } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    const updated = data as Habit
    if (updated.archived_at) {
      setHabits((prev) => prev.filter((h) => h.id !== id))
    } else {
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)))
    }
    return updated
  }, [])

  const archiveHabit = useCallback(
    async (id: string) => {
      return updateHabit(id, { archived_at: new Date().toISOString() })
    },
    [updateHabit],
  )

  const toggleCompletion = useCallback(
    async (habitId: string, date: Date = new Date()) => {
      if (!user) throw new Error('Not signed in')

      const dateStr = toDateString(date)
      const existing = completions.find(
        (c) => c.habit_id === habitId && c.completion_date === dateStr,
      )

      if (existing) {
        const { error: deleteError } = await supabase
          .from('habit_completions')
          .delete()
          .eq('id', existing.id)

        if (deleteError) throw deleteError
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id))
        return null
      }

      const { data, error: upsertError } = await supabase
        .from('habit_completions')
        .upsert(
          {
            user_id: user.id,
            habit_id: habitId,
            completion_date: dateStr,
          },
          { onConflict: 'user_id,habit_id,completion_date' },
        )
        .select()
        .single()

      if (upsertError) throw upsertError
      setCompletions((prev) => [data as HabitCompletion, ...prev])
      return data as HabitCompletion
    },
    [user, completions],
  )

  return {
    habits,
    completions,
    loading,
    error,
    refresh: fetchAll,
    createHabit,
    updateHabit,
    archiveHabit,
    toggleCompletion,
  }
}
