import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDomain } from '../hooks/useDomain'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'
import { ContentSkeleton, PageHeader } from '../components/ui'
import type { Domain } from '../types'

export function SettingsPage() {
  const { user, session, signOut } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    domain,
    domainLabel,
    domains,
    loading: domainsLoading,
    createDomain,
    renameDomain,
    archiveDomain,
  } = useDomain()
  const {
    status: calendarStatus,
    error: calendarError,
    busy: calendarBusy,
    connect: connectCalendar,
    fixPermissions,
    disconnect: disconnectCalendar,
    handleOAuthReturn,
  } = useGoogleCalendar()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [domainBusy, setDomainBusy] = useState(false)
  const [domainError, setDomainError] = useState<string | null>(null)
  const [domainMessage, setDomainMessage] = useState<string | null>(null)
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null)
  const [calendarActionError, setCalendarActionError] = useState<string | null>(
    null,
  )

  useEffect(() => {
    if (searchParams.get('calendar') !== 'connected') return
    if (!session) return

    let cancelled = false
    void (async () => {
      const result = await handleOAuthReturn()
      if (cancelled) return
      if (result.ok) {
        setCalendarMessage(result.message)
        setCalendarActionError(null)
      } else {
        setCalendarActionError(result.message)
        setCalendarMessage(null)
      }
      const next = new URLSearchParams(searchParams)
      next.delete('calendar')
      setSearchParams(next, { replace: true })
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, setSearchParams, handleOAuthReturn, session])

  useEffect(() => {
    if (window.location.hash !== '#integrations') return
    document
      .getElementById('integrations')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  async function handleSignOut() {
    setBusy(true)
    setError(null)
    try {
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-out failed')
      setBusy(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setDomainBusy(true)
    setDomainError(null)
    setDomainMessage(null)
    try {
      await createDomain(newName)
      setNewName('')
      setDomainMessage('Domain added.')
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Failed to add domain')
    } finally {
      setDomainBusy(false)
    }
  }

  function startEdit(d: Domain) {
    setEditingId(d.id)
    setEditName(d.name)
    setDomainError(null)
    setDomainMessage(null)
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setDomainBusy(true)
    setDomainError(null)
    setDomainMessage(null)
    try {
      await renameDomain(editingId, editName)
      setEditingId(null)
      setEditName('')
      setDomainMessage('Domain renamed.')
    } catch (err) {
      setDomainError(
        err instanceof Error ? err.message : 'Failed to rename domain',
      )
    } finally {
      setDomainBusy(false)
    }
  }

  async function handleArchive(d: Domain) {
    if (domains.length <= 1) {
      setDomainError('You must keep at least one domain.')
      return
    }
    const confirmed = window.confirm(
      `Archive “${d.name}”? Tasks and habits in this domain stay in the database but the domain is hidden from the toggle.`,
    )
    if (!confirmed) return

    setDomainBusy(true)
    setDomainError(null)
    setDomainMessage(null)
    try {
      await archiveDomain(d.id)
      setDomainMessage(`“${d.name}” archived.`)
    } catch (err) {
      setDomainError(
        err instanceof Error ? err.message : 'Failed to archive domain',
      )
    } finally {
      setDomainBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account and preferences" />

      <section className="mb-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-800">Account</h2>
        <p className="mt-2 text-sm text-stone-600">
          {user?.email ?? 'Signed in'}
        </p>
        {error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={busy}
          className="mt-4 rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </section>

      <section className="mb-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-800">Domains</h2>
        <p className="mt-2 text-sm text-stone-600">
          Current filter: <strong>{domainLabel}</strong> ({domain}). Use the
          header toggle to switch. Data is stored separately per domain.
        </p>

        {domainsLoading && domains.length === 0 ? (
          <div className="mt-4">
            <ContentSkeleton rows={2} />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                {editingId === d.id ? (
                  <form
                    onSubmit={handleRename}
                    className="flex flex-1 flex-wrap items-center gap-2"
                  >
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-w-[10rem] flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                      autoFocus
                      disabled={domainBusy}
                    />
                    <button
                      type="submit"
                      disabled={domainBusy || !editName.trim()}
                      className="rounded-md bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={domainBusy}
                      className="rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-600"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {d.name}
                        {d.slug === domain ? (
                          <span className="ml-2 text-xs font-normal text-stone-400">
                            active
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-stone-400">{d.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        disabled={domainBusy}
                        className="rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleArchive(d)}
                        disabled={domainBusy || domains.length <= 1}
                        className="rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                        title={
                          domains.length <= 1
                            ? 'Keep at least one domain'
                            : 'Archive domain'
                        }
                      >
                        Archive
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New domain name"
            className="min-w-[12rem] flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
            disabled={domainBusy}
          />
          <button
            type="submit"
            disabled={domainBusy || !newName.trim()}
            className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {domainBusy ? 'Saving…' : 'Add domain'}
          </button>
        </form>

        {domainError ? (
          <p className="mt-2 text-xs text-red-600">{domainError}</p>
        ) : null}
        {domainMessage ? (
          <p className="mt-2 text-xs text-stone-500">{domainMessage}</p>
        ) : null}
      </section>

      <section
        id="integrations"
        className="scroll-mt-6 rounded-lg border border-stone-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-stone-800">Integrations</h2>
        <p className="mt-2 text-sm text-stone-600">
          Google Calendar (read-only) for today&apos;s events on the Dashboard.
        </p>

        <div className="mt-4 rounded-md border border-stone-100 bg-stone-50 px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-stone-800">
                Google Calendar
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {calendarStatus === 'loading'
                  ? 'Checking connection…'
                  : calendarStatus === 'connected'
                    ? 'Connected'
                    : calendarStatus === 'needs_fix'
                      ? 'Needs attention — reconnect to restore access'
                      : 'Not connected'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {calendarStatus === 'not_connected' ||
              calendarStatus === 'loading' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCalendarActionError(null)
                    setCalendarMessage(null)
                    void connectCalendar()
                  }}
                  disabled={calendarBusy || calendarStatus === 'loading'}
                  className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {calendarBusy ? 'Redirecting…' : 'Connect Google Calendar'}
                </button>
              ) : null}
              {calendarStatus === 'needs_fix' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCalendarActionError(null)
                    setCalendarMessage(null)
                    void fixPermissions()
                  }}
                  disabled={calendarBusy}
                  className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {calendarBusy ? 'Redirecting…' : 'Fix permissions'}
                </button>
              ) : null}
              {calendarStatus === 'connected' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarActionError(null)
                      setCalendarMessage(null)
                      void connectCalendar()
                    }}
                    disabled={calendarBusy}
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-white disabled:opacity-50"
                  >
                    Reconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarActionError(null)
                      setCalendarMessage(null)
                      void disconnectCalendar()
                    }}
                    disabled={calendarBusy}
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-white disabled:opacity-50"
                  >
                    {calendarBusy ? 'Working…' : 'Disconnect'}
                  </button>
                </>
              ) : null}
              {calendarStatus === 'needs_fix' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCalendarActionError(null)
                    setCalendarMessage(null)
                    void disconnectCalendar()
                  }}
                  disabled={calendarBusy}
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-white disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {(calendarActionError || calendarError) && (
          <p className="mt-2 text-xs text-red-600">
            {calendarActionError ?? calendarError}
          </p>
        )}
        {calendarMessage ? (
          <p className="mt-2 text-xs text-stone-500">{calendarMessage}</p>
        ) : null}
      </section>
    </div>
  )
}
