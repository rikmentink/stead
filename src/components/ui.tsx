import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-500">
      {message}
    </p>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  )
}

/** Inline placeholder for list / data regions (initial load only). */
export function ContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="animate-pulse space-y-2 rounded-lg border border-stone-200 bg-white px-4 py-3"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 rounded bg-stone-100" />
      ))}
    </div>
  )
}

/** Inline placeholder for dashboard stat tiles. */
export function StatSkeleton() {
  return (
    <div
      className="animate-pulse rounded-lg border border-stone-200 bg-white px-3 py-3"
      aria-busy="true"
    >
      <div className="h-3 w-16 rounded bg-stone-100" />
      <div className="mt-2 h-6 w-10 rounded bg-stone-100" />
    </div>
  )
}
