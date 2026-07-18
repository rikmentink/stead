import { Outlet } from 'react-router-dom'
import { Nav } from '../components/Nav'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
