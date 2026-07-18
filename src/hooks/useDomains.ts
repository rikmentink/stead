import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_DOMAINS, uniqueDomainSlug } from '../lib/constants'
import type { Domain, DomainUpdate } from '../types'
import { useAuth } from './useAuth'
import { usePollingRefresh } from './useRefetch'

export function useDomains() {
  const { user } = useAuth()
  const userId = user?.id
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    hasLoadedRef.current = false
    setLoading(true)
  }, [userId])

  const fetchDomains = useCallback(async () => {
    if (!userId) {
      // Keep prior domains if we already loaded — avoids chrome flash on auth churn.
      if (!hasLoadedRef.current) {
        setDomains([])
        hasLoadedRef.current = true
        setLoading(false)
      }
      return
    }

    const isInitial = !hasLoadedRef.current
    if (isInitial) setLoading(true)
    setError(null)

    try {
      await ensureDefaultDomains(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed domains')
      hasLoadedRef.current = true
      setLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      if (isInitial) {
        hasLoadedRef.current = true
        setLoading(false)
      }
      return
    }

    setDomains((data as Domain[]) ?? [])
    hasLoadedRef.current = true
    setLoading(false)
  }, [userId])

  usePollingRefresh(fetchDomains)

  const createDomain = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Not signed in')
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Domain name is required')

      const slug = uniqueDomainSlug(
        trimmed,
        domains.map((d) => d.slug),
      )
      const sort_order =
        domains.reduce((max, d) => Math.max(max, d.sort_order), -1) + 1

      const { data, error: insertError } = await supabase
        .from('domains')
        .insert({
          user_id: user.id,
          name: trimmed,
          slug,
          sort_order,
        })
        .select()
        .single()

      if (insertError) throw insertError
      const created = data as Domain
      setDomains((prev) => [...prev, created])
      return created
    },
    [user, domains],
  )

  const renameDomain = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Domain name is required')

    const updates: DomainUpdate = { name: trimmed }
    const { data, error: updateError } = await supabase
      .from('domains')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    const updated = data as Domain
    setDomains((prev) => prev.map((d) => (d.id === id ? updated : d)))
    return updated
  }, [])

  const archiveDomain = useCallback(
    async (id: string) => {
      if (domains.length <= 1) {
        throw new Error('You must keep at least one domain')
      }

      const { data, error: updateError } = await supabase
        .from('domains')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      setDomains((prev) => prev.filter((d) => d.id !== id))
      return data as Domain
    },
    [domains.length],
  )

  return {
    domains,
    loading,
    error,
    refresh: fetchDomains,
    createDomain,
    renameDomain,
    archiveDomain,
  }
}

/** Seed Personal + Work when the user has no active domains. */
async function ensureDefaultDomains(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('domains')
    .select('id')
    .eq('user_id', userId)
    .is('archived_at', null)
    .limit(1)

  if (error) throw error
  if (data && data.length > 0) return

  // Prefer reactivating archived defaults if present; otherwise insert.
  const { data: archivedDefaults } = await supabase
    .from('domains')
    .select('id, slug')
    .eq('user_id', userId)
    .in(
      'slug',
      DEFAULT_DOMAINS.map((d) => d.slug),
    )
    .not('archived_at', 'is', null)

  if (archivedDefaults && archivedDefaults.length > 0) {
    const ids = archivedDefaults.map((d) => d.id)
    await supabase
      .from('domains')
      .update({ archived_at: null })
      .in('id', ids)
  }

  const existingSlugs = new Set((archivedDefaults ?? []).map((d) => d.slug))
  const toInsert = DEFAULT_DOMAINS.filter((d) => !existingSlugs.has(d.slug)).map(
    (d) => ({
      user_id: userId,
      slug: d.slug,
      name: d.name,
      sort_order: d.sort_order,
    }),
  )

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('domains')
      .insert(toInsert)
    if (insertError) throw insertError
  }
}
