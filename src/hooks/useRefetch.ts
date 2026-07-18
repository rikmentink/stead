import { useEffect, useRef } from 'react'

/**
 * Fetch once when `refetch` identity changes, then poll while the tab is visible.
 * Pauses when hidden; restarting the interval on visibility does NOT fire a fetch.
 */
export function usePollingRefresh(
  refetch: () => void | Promise<void>,
  intervalMs = 30_000,
) {
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null

    const clear = () => {
      if (id !== null) {
        clearInterval(id)
        id = null
      }
    }

    const start = () => {
      clear()
      id = setInterval(() => {
        void refetchRef.current()
      }, intervalMs)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Resume polling on the next interval tick only — no immediate catch-up fetch.
        start()
      } else {
        clear()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clear()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs])
}
