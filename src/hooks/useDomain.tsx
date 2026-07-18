import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Domain, DomainSlug } from '../types'
import { DOMAIN_STORAGE_KEY } from '../lib/constants'
import { useDomains } from './useDomains'

interface DomainContextValue {
  /** Selected domain slug (filters dashboard / lists). */
  domain: DomainSlug
  setDomain: (slug: DomainSlug) => void
  /** Display name for the selected domain. */
  domainLabel: string
  domains: Domain[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createDomain: (name: string) => Promise<Domain>
  renameDomain: (id: string, name: string) => Promise<Domain>
  archiveDomain: (id: string) => Promise<Domain>
}

const DomainContext = createContext<DomainContextValue | null>(null)

function readStoredDomainSlug(): DomainSlug | null {
  try {
    return localStorage.getItem(DOMAIN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function DomainProvider({ children }: { children: ReactNode }) {
  const {
    domains,
    loading,
    error,
    refresh,
    createDomain,
    renameDomain,
    archiveDomain: archiveDomainBase,
  } = useDomains()

  const [domain, setDomainState] = useState<DomainSlug>(
    () => readStoredDomainSlug() ?? 'personal',
  )

  // Fall back when stored slug is missing/archived once domains load.
  useEffect(() => {
    if (loading || domains.length === 0) return
    const active = domains.some((d) => d.slug === domain)
    if (!active) {
      setDomainState(domains[0].slug)
    }
  }, [loading, domains, domain])

  useEffect(() => {
    try {
      localStorage.setItem(DOMAIN_STORAGE_KEY, domain)
    } catch {
      // ignore
    }
  }, [domain])

  const setDomain = useCallback((next: DomainSlug) => {
    setDomainState(next)
  }, [])

  const archiveDomain = useCallback(
    async (id: string) => {
      const target = domains.find((d) => d.id === id)
      const archived = await archiveDomainBase(id)
      if (target && target.slug === domain) {
        const remaining = domains.filter((d) => d.id !== id)
        if (remaining[0]) setDomainState(remaining[0].slug)
      }
      return archived
    },
    [archiveDomainBase, domains, domain],
  )

  const domainLabel = useMemo(() => {
    const match = domains.find((d) => d.slug === domain)
    return match?.name ?? domain
  }, [domains, domain])

  const value = useMemo(
    () => ({
      domain,
      setDomain,
      domainLabel,
      domains,
      loading,
      error,
      refresh,
      createDomain,
      renameDomain,
      archiveDomain,
    }),
    [
      domain,
      setDomain,
      domainLabel,
      domains,
      loading,
      error,
      refresh,
      createDomain,
      renameDomain,
      archiveDomain,
    ],
  )

  return (
    <DomainContext.Provider value={value}>{children}</DomainContext.Provider>
  )
}

export function useDomain(): DomainContextValue {
  const ctx = useContext(DomainContext)
  if (!ctx) throw new Error('useDomain must be used within DomainProvider')
  return ctx
}
