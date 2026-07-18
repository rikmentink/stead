import { Link } from 'react-router-dom'
import { APP_NAME } from '../lib/constants'

type BrandMarkProps = {
  /** Pass `null` to render without a link (e.g. login). Default `/`. */
  to?: string | null
  size?: 'sm' | 'lg'
  className?: string
}

const sizeClass = {
  sm: 'text-[1.55rem] leading-none',
  lg: 'text-4xl leading-none sm:text-5xl',
} as const

/** Classy serif wordmark for Stead. */
export function BrandMark({
  to = '/',
  size = 'sm',
  className = '',
}: BrandMarkProps) {
  const classes = [
    'font-[family-name:var(--font-brand)] font-bold uppercase tracking-[0.08em] text-stone-900',
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const mark = <span className={classes}>{APP_NAME}</span>

  if (to == null) return mark

  return (
    <Link
      to={to}
      className="inline-block shrink-0 no-underline"
      aria-label={APP_NAME}
    >
      {mark}
    </Link>
  )
}
