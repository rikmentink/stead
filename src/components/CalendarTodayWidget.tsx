import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  differenceInMinutes,
  format,
  parseISO,
  startOfDay,
} from 'date-fns'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'
import { ContentSkeleton, EmptyState } from './ui'
import {
  GOOGLE_CALENDAR_URL,
  getGoogleEventColor,
  type CalendarEvent,
} from '../lib/googleCalendar'

const HOUR_HEIGHT = 44
const HOURS = 24
const TIMELINE_HEIGHT = HOURS * HOUR_HEIGHT
const SCROLL_MAX_HEIGHT = 260
const MIN_EVENT_HEIGHT = 18
/** Opacity for fully-past chips and the portion of ongoing chips above “now”. */
const PAST_OPACITY = 0.5

export function CalendarTodayWidget() {
  const { status, events, error, busy, fixPermissions } = useGoogleCalendar()

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-800">
          Today&apos;s calendar
        </h2>
        {status === 'connected' ? (
          <a
            href={GOOGLE_CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            Open Google Calendar
          </a>
        ) : null}
      </div>

      {status === 'loading' ? <ContentSkeleton rows={3} /> : null}

      {status === 'not_connected' ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Connect Google Calendar to see today&apos;s events here.
          </p>
          <Link
            to="/settings#integrations"
            className="inline-block rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Connect in Settings
          </Link>
        </div>
      ) : null}

      {status === 'needs_fix' ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Calendar access expired or was revoked. Reconnect to fix
            permissions.
          </p>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={() => void fixPermissions()}
            disabled={busy}
            className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Redirecting…' : 'Fix permissions'}
          </button>
        </div>
      ) : null}

      {status === 'connected' ? (
        <>
          {error ? (
            <p className="mb-2 text-xs text-red-600">{error}</p>
          ) : null}
          {events.length === 0 ? (
            <EmptyState message="No events today" />
          ) : (
            <DayTimeline events={events} />
          )}
        </>
      ) : null}
    </section>
  )
}

function DayTimeline({ events }: { events: CalendarEvent[] }) {
  const [now, setNow] = useState(() => new Date())
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowLineRef = useRef<HTMLDivElement>(null)
  const didScroll = useRef(false)

  useEffect(() => {
    const tick = () => setNow(new Date())
    const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50
    let intervalId = 0
    const timeoutId = window.setTimeout(() => {
      tick()
      intervalId = window.setInterval(tick, 60_000)
    }, msToNextMinute)
    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (didScroll.current) return
    const line = nowLineRef.current
    const scroller = scrollRef.current
    if (!line || !scroller) return
    didScroll.current = true
    // Line uses -translate-y-1/2, so visual center is at offsetTop (nowTop).
    const target = line.offsetTop - scroller.clientHeight / 2
    scroller.scrollTop = Math.max(0, target)
  }, [events])

  const dayStart = useMemo(() => startOfDay(now), [now])

  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDayEvents: CalendarEvent[] = []
    const timedEvents: CalendarEvent[] = []
    for (const event of events) {
      if (event.allDay) allDayEvents.push(event)
      else timedEvents.push(event)
    }
    return { allDayEvents, timedEvents }
  }, [events])

  const layout = useMemo(
    () => layoutTimedEvents(timedEvents, dayStart),
    [timedEvents, dayStart],
  )

  const nowMinutes = differenceInMinutes(now, dayStart)
  const clampedNow = Math.max(0, Math.min(HOURS * 60, nowMinutes))
  const nowTop = (clampedNow / 60) * HOUR_HEIGHT
  const showNowLine = nowMinutes >= 0 && nowMinutes <= HOURS * 60

  return (
    <div className="space-y-2">
      {allDayEvents.length > 0 ? (
        <div className="flex gap-2 border-b border-stone-100 pb-2">
          <span className="w-11 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-400">
            All day
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {allDayEvents.map((event) => (
              <AllDayChip key={event.id} event={event} />
            ))}
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="relative overflow-y-auto overscroll-contain"
        style={{ maxHeight: SCROLL_MAX_HEIGHT }}
      >
        <div
          className="relative"
          style={{ height: TIMELINE_HEIGHT }}
        >
          {Array.from({ length: HOURS }, (_, hour) => (
            <div
              key={hour}
              className="absolute right-0 left-0 flex border-t border-stone-100"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="w-11 shrink-0 -translate-y-1/2 pr-2 text-right text-[10px] tabular-nums text-stone-400">
                {hour === 0 ? '' : formatHourLabel(hour)}
              </span>
              <div className="min-w-0 flex-1" />
            </div>
          ))}

          <div className="absolute top-0 right-0 bottom-0 left-11">
            {layout.map(({ event, top, height, leftPct, widthPct }) => {
              let start: Date
              let end: Date
              try {
                start = parseISO(event.start)
                end = parseISO(event.end)
              } catch {
                return null
              }
              const phase: EventPhase =
                end <= now ? 'past' : start < now ? 'ongoing' : 'upcoming'
              return (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  top={top}
                  height={height}
                  leftPct={leftPct}
                  widthPct={widthPct}
                  phase={phase}
                  nowTop={nowTop}
                />
              )
            })}
          </div>

          {showNowLine ? (
            <div
              ref={nowLineRef}
              className="pointer-events-none absolute right-0 left-0 z-20 -translate-y-1/2"
              style={{ top: nowTop }}
            >
              <div className="flex items-center">
                <span className="relative z-20 flex w-11 shrink-0 justify-end pr-0.5">
                  <span className="rounded-sm bg-white px-1 py-0.5 text-[10px] font-semibold tabular-nums text-red-500 shadow-sm ring-1 ring-white">
                    {format(now, 'h:mm')}
                  </span>
                </span>
                <div className="relative min-w-0 flex-1">
                  <div className="absolute top-1/2 left-0 z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
                  <div className="h-px w-full bg-red-500" />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AllDayChip({ event }: { event: CalendarEvent }) {
  const color = getGoogleEventColor(event.colorId)
  const inner = (
    <span
      className={[
        'inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium',
        color ? '' : 'bg-sky-100 text-sky-900',
      ].join(' ')}
      style={
        color
          ? { backgroundColor: color.background, color: color.foreground }
          : undefined
      }
    >
      {event.summary}
    </span>
  )
  if (!event.htmlLink) return inner
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noreferrer"
      className="max-w-full hover:opacity-80"
    >
      {inner}
    </a>
  )
}

type EventPhase = 'past' | 'ongoing' | 'upcoming'

function TimelineEvent({
  event,
  top,
  height,
  leftPct,
  widthPct,
  phase,
  nowTop,
}: {
  event: CalendarEvent
  top: number
  height: number
  leftPct: number
  widthPct: number
  phase: EventPhase
  nowTop: number
}) {
  const color = getGoogleEventColor(event.colorId)
  const style = eventChipStyle(color)
  const left = `calc(${leftPct}% + 2px)`
  const width = `calc(${widthPct}% - 4px)`

  // Shared with the opacity mask so sticky pinning and the now-line stay aligned.
  const pastH =
    phase === 'ongoing'
      ? Math.max(0, Math.min(height, nowTop - top))
      : 0
  const remaining = height - pastH
  // Prefer title in the “remaining” slice below now when that slice can fit it.
  const pinBelowNow =
    phase === 'ongoing' && pastH > 0 && remaining >= (height < 28 ? 16 : 28)

  const body = (
    <EventChipBody
      event={event}
      height={height}
      color={color}
      pinBelowNow={pinBelowNow}
      pastH={pastH}
    />
  )

  // Hard opacity split at the same Y as the now-line (nowTop), via a single
  // mask so chip padding/rounding and layer stacking cannot drift from the line.
  const ongoingMask =
    phase === 'ongoing'
      ? (() => {
          const pastPct = height > 0 ? (pastH / height) * 100 : 0
          const mask = `linear-gradient(to bottom, rgba(0,0,0,${PAST_OPACITY}) 0%, rgba(0,0,0,${PAST_OPACITY}) ${pastPct}%, #000 ${pastPct}%, #000 100%)`
          return {
            maskImage: mask,
            WebkitMaskImage: mask,
          } satisfies CSSProperties
        })()
      : undefined

  // overflow-clip keeps rounded corners without creating a scroll container,
  // so sticky titles can stick to the timeline scroller within this chip.
  const chip = (
    <div
      className="absolute overflow-clip rounded-md"
      style={{
        top,
        height,
        left,
        width,
        ...style,
        ...(phase === 'past' ? { opacity: PAST_OPACITY } : null),
        ...ongoingMask,
      }}
      title={event.summary}
    >
      {body}
    </div>
  )

  if (!event.htmlLink) return chip
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noreferrer"
      className="contents"
    >
      {chip}
    </a>
  )
}

function eventChipStyle(
  color: { background: string; foreground: string } | null,
): CSSProperties {
  if (color) {
    return { backgroundColor: color.background, color: color.foreground }
  }
  return { backgroundColor: '#0ea5e9', color: '#ffffff' } // sky-500
}

function EventChipBody({
  event,
  height,
  color,
  pinBelowNow = false,
  pastH = 0,
}: {
  event: CalendarEvent
  height: number
  color: { background: string; foreground: string } | null
  pinBelowNow?: boolean
  pastH?: number
}) {
  const compact = height < 28
  // Match chip fill so the sticky header doesn’t show through while scrolling.
  const bg = color?.background ?? '#0ea5e9'
  return (
    <div className="h-full text-[11px] leading-tight">
      {pinBelowNow ? (
        <div style={{ height: pastH }} aria-hidden className="shrink-0" />
      ) : null}
      <div
        className="sticky top-0 z-[1] w-full px-1.5 py-0.5"
        style={{ backgroundColor: bg }}
      >
        <p className="truncate font-medium">{event.summary}</p>
        {!compact ? (
          <p
            className={[
              'truncate tabular-nums',
              color ? 'opacity-80' : 'text-sky-100',
            ].join(' ')}
          >
            {formatEventClock(event.start)}
            {' – '}
            {formatEventClock(event.end)}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function formatHourLabel(hour: number): string {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return format(d, 'h a')
}

function formatEventClock(iso: string): string {
  try {
    return format(parseISO(iso), 'h:mm a')
  } catch {
    return ''
  }
}

function clampMinutes(minutes: number): number {
  return Math.max(0, Math.min(HOURS * 60, minutes))
}

interface LaidOutEvent {
  event: CalendarEvent
  top: number
  height: number
  leftPct: number
  widthPct: number
  startMin: number
  endMin: number
  column: number
}

function layoutTimedEvents(
  events: CalendarEvent[],
  dayStart: Date,
): LaidOutEvent[] {
  const prepared = events
    .map((event) => {
      let start: Date
      let end: Date
      try {
        start = parseISO(event.start)
        end = parseISO(event.end)
      } catch {
        return null
      }
      const startMin = clampMinutes(differenceInMinutes(start, dayStart))
      const endMin = clampMinutes(differenceInMinutes(end, dayStart))
      if (endMin <= startMin) return null
      const top = (startMin / 60) * HOUR_HEIGHT
      const height = Math.max(
        ((endMin - startMin) / 60) * HOUR_HEIGHT,
        MIN_EVENT_HEIGHT,
      )
      return { event, top, height, startMin, endMin }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const columnEnds: number[] = []
  const withColumns = prepared.map((item) => {
    let column = 0
    while (column < columnEnds.length && columnEnds[column]! > item.startMin) {
      column += 1
    }
    columnEnds[column] = item.endMin
    return { ...item, column }
  })

  // Equal-width columns within each overlap cluster.
  const clusterCols = withColumns.map(() => 1)
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < withColumns.length; i++) {
      for (let j = i + 1; j < withColumns.length; j++) {
        const a = withColumns[i]!
        const b = withColumns[j]!
        if (a.startMin < b.endMin && b.startMin < a.endMin) {
          const max = Math.max(
            clusterCols[i]!,
            clusterCols[j]!,
            a.column + 1,
            b.column + 1,
          )
          if (clusterCols[i] !== max || clusterCols[j] !== max) {
            clusterCols[i] = max
            clusterCols[j] = max
            changed = true
          }
        }
      }
    }
  }

  return withColumns.map((item, i) => {
    const cols = clusterCols[i] ?? 1
    const widthPct = 100 / cols
    return {
      ...item,
      leftPct: item.column * widthPct,
      widthPct,
    }
  })
}
