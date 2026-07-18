import { useDomain } from '../hooks/useDomain'

export function DomainToggle() {
  const { domain, setDomain, domains, loading } = useDomain()

  if (loading && domains.length === 0) {
    return (
      <div className="inline-flex h-7 items-center rounded-md border border-stone-200 bg-stone-50 px-2 text-xs text-stone-400">
        …
      </div>
    )
  }

  return (
    <div
      className="inline-flex max-w-full flex-wrap rounded-md border border-stone-200 bg-stone-50 p-0.5 text-xs"
      role="group"
      aria-label="Domain"
    >
      {domains.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => setDomain(d.slug)}
          className={[
            'rounded px-2.5 py-1 font-medium transition-colors',
            domain === d.slug
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800',
          ].join(' ')}
        >
          {d.name}
        </button>
      ))}
    </div>
  )
}
