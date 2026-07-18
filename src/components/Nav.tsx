import { NavLink } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { DomainToggle } from './DomainToggle'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/habits', label: 'Habits' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

export function Nav() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <div className="sm:hidden">
            <DomainToggle />
          </div>
        </div>

        <nav className="flex flex-wrap gap-4 text-sm">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  'py-1 transition-colors',
                  isActive
                    ? 'font-medium text-stone-900 underline decoration-stone-400 underline-offset-4'
                    : 'text-stone-500 hover:text-stone-800',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden sm:block">
          <DomainToggle />
        </div>
      </div>
    </header>
  )
}
