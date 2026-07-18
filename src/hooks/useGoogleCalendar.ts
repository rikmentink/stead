import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { usePollingRefresh } from './useRefetch'
import { supabase } from '../lib/supabase'
import {
  deleteGoogleCalendarTokens,
  fetchTodaysCalendarEvents,
  getStoredCalendarTokens,
  persistGoogleCalendarTokens,
  startGoogleCalendarOAuth,
  type CalendarConnectionStatus,
  type CalendarEvent,
} from '../lib/googleCalendar'

export function useGoogleCalendar() {
  const { user, session } = useAuth()
  const [status, setStatus] = useState<CalendarConnectionStatus>('loading')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus('not_connected')
      setEvents([])
      setError(null)
      return
    }

    try {
      setError(null)
      const result = await fetchTodaysCalendarEvents(user.id)
      setStatus(result.status)
      setEvents(result.events)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
      // Keep prior status if we already know; otherwise probe token row.
      const row = await getStoredCalendarTokens(user.id).catch(() => null)
      setStatus(row ? 'needs_fix' : 'not_connected')
      setEvents([])
    }
  }, [user])

  usePollingRefresh(refresh, 60_000)

  /** After `?calendar=connected` OAuth redirect, persist provider tokens once. */
  const handleOAuthReturn = useCallback(async (): Promise<{
    ok: boolean
    message: string
  }> => {
    // Prefer fresh session — provider_token is only present right after OAuth.
    const { data } = await supabase.auth.getSession()
    const active = data.session ?? session
    if (!active?.user) {
      return { ok: false, message: 'Not signed in after calendar connect.' }
    }

    try {
      const saved = await persistGoogleCalendarTokens(active)
      if (!saved) {
        const row = await getStoredCalendarTokens(active.user.id)
        if (!row) {
          return {
            ok: false,
            message:
              'Google did not return calendar tokens. Try Connect again and grant Calendar access.',
          }
        }
      }
      await refresh()
      return { ok: true, message: 'Google Calendar connected.' }
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error ? err.message : 'Failed to save calendar tokens',
      }
    }
  }, [session, refresh])

  const connect = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await startGoogleCalendarOAuth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connect failed')
      setBusy(false)
    }
  }, [])

  const fixPermissions = useCallback(async () => {
    await connect()
  }, [connect])

  const disconnect = useCallback(async () => {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await deleteGoogleCalendarTokens(user.id)
      setStatus('not_connected')
      setEvents([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }, [user])

  // Initial status while first poll runs
  useEffect(() => {
    if (!user) {
      setStatus('not_connected')
      return
    }
    setStatus((prev) => (prev === 'loading' ? 'loading' : prev))
  }, [user])

  return {
    status,
    events,
    error,
    busy,
    refresh,
    connect,
    fixPermissions,
    disconnect,
    handleOAuthReturn,
  }
}
