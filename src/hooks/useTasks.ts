import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { canPinTask } from '../lib/tasks'
import { MAX_PINNED_TASKS } from '../lib/constants'
import type { DomainSlug, Task, TaskInsert, TaskUpdate } from '../types'
import { useAuth } from './useAuth'
import { usePollingRefresh } from './useRefetch'

export function useTasks(domain: DomainSlug) {
  const { user } = useAuth()
  const userId = user?.id
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  // Soft-load gate resets only when the data key changes — not on token refresh.
  useEffect(() => {
    hasLoadedRef.current = false
    setLoading(true)
  }, [userId, domain])

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([])
      hasLoadedRef.current = true
      setLoading(false)
      return
    }

    const isInitial = !hasLoadedRef.current
    if (isInitial) setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('domain', domain)
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      if (isInitial) {
        hasLoadedRef.current = true
        setLoading(false)
      }
      return
    }

    setTasks((data as Task[]) ?? [])
    hasLoadedRef.current = true
    setLoading(false)
  }, [userId, domain])

  usePollingRefresh(fetchTasks)

  const createTask = useCallback(
    async (input: Omit<TaskInsert, 'domain'> & { domain?: DomainSlug }) => {
      if (!user) throw new Error('Not signed in')

      const payload = {
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        due_date: input.due_date ?? null,
        domain: input.domain ?? domain,
        status: input.status ?? 'todo',
        is_pinned: input.is_pinned ?? false,
        user_id: user.id,
      }

      if (payload.is_pinned && !canPinTask(tasks)) {
        throw new Error(`You can pin at most ${MAX_PINNED_TASKS} open tasks`)
      }

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single()

      if (insertError) throw insertError
      setTasks((prev) => [data as Task, ...prev])
      return data as Task
    },
    [user, domain, tasks],
  )

  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate) => {
      if (updates.is_pinned === true) {
        const existing = tasks.find((t) => t.id === id)
        if (!canPinTask(tasks, existing)) {
          throw new Error(`You can pin at most ${MAX_PINNED_TASKS} open tasks`)
        }
      }

      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const updated = data as Task
      if (updated.archived_at) {
        setTasks((prev) => prev.filter((t) => t.id !== id))
      } else {
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
      }
      return updated
    },
    [tasks],
  )

  const completeTask = useCallback(
    async (id: string, completed = true) => {
      // Retain pin: dashboard today filter uses is_pinned; kanban via getPinnedTasks skips completed.
      return updateTask(id, {
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
    },
    [updateTask],
  )

  const togglePin = useCallback(
    async (task: Task) => {
      if (!task.is_pinned && !canPinTask(tasks, task)) {
        throw new Error(`You can pin at most ${MAX_PINNED_TASKS} open tasks`)
      }
      return updateTask(task.id, { is_pinned: !task.is_pinned })
    },
    [tasks, updateTask],
  )

  const archiveTask = useCallback(
    async (id: string) => {
      return updateTask(id, { archived_at: new Date().toISOString() })
    },
    [updateTask],
  )

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
    createTask,
    updateTask,
    completeTask,
    togglePin,
    archiveTask,
  }
}
