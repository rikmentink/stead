import { endOfDay, format, parseISO, startOfDay } from 'date-fns'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const CALENDAR_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.readonly'

export const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/'

export type CalendarConnectionStatus =
  | 'not_connected'
  | 'connected'
  | 'needs_fix'
  | 'loading'

export interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  htmlLink: string | null
  /** Google Calendar event colorId ("1"–"11"), when set by the user. */
  colorId: string | null
}

/** Official Google Calendar event colors from colors.get (event key). */
export const GOOGLE_EVENT_COLORS: Record<
  string,
  { background: string; foreground: string }
> = {
  '1': { background: '#a4bdfc', foreground: '#1d1d1d' }, // Lavender
  '2': { background: '#7ae7bf', foreground: '#1d1d1d' }, // Sage
  '3': { background: '#dbadff', foreground: '#1d1d1d' }, // Grape
  '4': { background: '#ff887c', foreground: '#1d1d1d' }, // Flamingo
  '5': { background: '#fbd75b', foreground: '#1d1d1d' }, // Banana
  '6': { background: '#ffb878', foreground: '#1d1d1d' }, // Tangerine
  '7': { background: '#46d6db', foreground: '#1d1d1d' }, // Peacock
  '8': { background: '#e1e1e1', foreground: '#1d1d1d' }, // Graphite
  '9': { background: '#5484ed', foreground: '#1d1d1d' }, // Blueberry
  '10': { background: '#51b749', foreground: '#1d1d1d' }, // Basil
  '11': { background: '#dc2127', foreground: '#1d1d1d' }, // Tomato
}

export function getGoogleEventColor(
  colorId: string | null | undefined,
): { background: string; foreground: string } | null {
  if (!colorId) return null
  return GOOGLE_EVENT_COLORS[colorId] ?? null
}

/** Client-readable fields only — refresh_token is not selectable by the browser. */
interface GoogleCalendarTokensRow {
  user_id: string
  access_token: string
  expiry: string
  updated_at: string
}

interface GoogleApiEvent {
  id?: string
  summary?: string
  htmlLink?: string
  colorId?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

function todayRangeIso(now = new Date()): { timeMin: string; timeMax: string } {
  return {
    timeMin: startOfDay(now).toISOString(),
    timeMax: endOfDay(now).toISOString(),
  }
}

export function formatEventTimeRange(event: {
  start: string
  end: string
  allDay: boolean
}): string {
  if (event.allDay) return 'All day'
  try {
    const start = parseISO(event.start)
    const end = parseISO(event.end)
    return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
  } catch {
    return event.start
  }
}

export async function getStoredCalendarTokens(
  userId: string,
): Promise<GoogleCalendarTokensRow | null> {
  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('user_id, access_token, expiry, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as GoogleCalendarTokensRow | null
}

/** Persist provider tokens right after calendar OAuth redirect. */
export async function persistGoogleCalendarTokens(
  session: Session,
): Promise<boolean> {
  const access = session.provider_token
  const refresh = session.provider_refresh_token
  if (!access || !refresh || !session.user) return false

  // Default Google access tokens last ~1 hour when expires_at is unknown.
  const expiry = new Date(Date.now() + 55 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('google_calendar_tokens')
    .upsert(
      {
        user_id: session.user.id,
        access_token: access,
        refresh_token: refresh,
        expiry,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    // Only return columns the client is allowed to SELECT (not refresh_token).
    .select('user_id, access_token, expiry, updated_at')

  if (error) throw error
  return true
}

export async function deleteGoogleCalendarTokens(
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', userId)
  if (error) throw error
}

function refreshError(
  message: string,
  needsReauth = false,
): Error & { needsReauth?: boolean } {
  const err = new Error(message) as Error & { needsReauth?: boolean }
  err.needsReauth = needsReauth
  return err
}

export async function refreshGoogleAccessToken(): Promise<{
  access_token: string
  expiry: string
}> {
  const { data, error } = await supabase.functions.invoke(
    'refresh-google-calendar',
    { method: 'POST' },
  )

  const body = data as {
    access_token?: string
    expiry?: string
    error?: string
    error_description?: string
    needs_reauth?: boolean
  } | null

  if (body?.access_token && body.expiry) {
    return { access_token: body.access_token, expiry: body.expiry }
  }

  const needsReauth =
    Boolean(body?.needs_reauth) ||
    body?.error === 'invalid_grant' ||
    /invalid_grant|reauth|reconnect/i.test(error?.message ?? '')

  throw refreshError(
    body?.error_description ||
      body?.error ||
      error?.message ||
      'Token refresh failed',
    needsReauth,
  )
}

async function resolveAccessToken(
  userId: string,
): Promise<{ accessToken: string; needsFix: boolean }> {
  const row = await getStoredCalendarTokens(userId)
  if (!row) return { accessToken: '', needsFix: false }

  const expired =
    !row.expiry || new Date(row.expiry).getTime() <= Date.now() + 60_000

  if (!expired) {
    return { accessToken: row.access_token, needsFix: false }
  }

  try {
    const refreshed = await refreshGoogleAccessToken()
    return { accessToken: refreshed.access_token, needsFix: false }
  } catch (err) {
    const needsReauth =
      err instanceof Error &&
      'needsReauth' in err &&
      Boolean((err as { needsReauth?: boolean }).needsReauth)
    if (needsReauth) return { accessToken: '', needsFix: true }
    // Fall through and try the stored token once; Calendar API may still work.
    return { accessToken: row.access_token, needsFix: false }
  }
}

function mapGoogleEvent(raw: GoogleApiEvent): CalendarEvent | null {
  if (!raw.id) return null
  const startRaw = raw.start?.dateTime ?? raw.start?.date
  const endRaw = raw.end?.dateTime ?? raw.end?.date
  if (!startRaw || !endRaw) return null
  const allDay = Boolean(raw.start?.date && !raw.start?.dateTime)
  return {
    id: raw.id,
    summary: raw.summary?.trim() || '(No title)',
    start: startRaw,
    end: endRaw,
    allDay,
    htmlLink: raw.htmlLink ?? null,
    colorId: raw.colorId ?? null,
  }
}

export async function fetchTodaysCalendarEvents(
  userId: string,
): Promise<{
  status: Exclude<CalendarConnectionStatus, 'loading'>
  events: CalendarEvent[]
}> {
  const { accessToken, needsFix } = await resolveAccessToken(userId)

  if (!accessToken) {
    return {
      status: needsFix ? 'needs_fix' : 'not_connected',
      events: [],
    }
  }

  const { timeMin, timeMax } = todayRangeIso()
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`

  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 401) {
    try {
      const refreshed = await refreshGoogleAccessToken()
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${refreshed.access_token}` },
      })
    } catch {
      return { status: 'needs_fix', events: [] }
    }
  }

  if (res.status === 401 || res.status === 403) {
    return { status: 'needs_fix', events: [] }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Calendar API error (${res.status})`)
  }

  const json = (await res.json()) as { items?: GoogleApiEvent[] }
  const events = (json.items ?? [])
    .map(mapGoogleEvent)
    .filter((e): e is CalendarEvent => e !== null)

  return { status: 'connected', events }
}

export async function startGoogleCalendarOAuth(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: CALENDAR_READONLY_SCOPE,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      redirectTo: `${window.location.origin}/settings?calendar=connected`,
    },
  })
  if (error) throw error
}
