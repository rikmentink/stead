import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BrandMark } from '../components/BrandMark'

export function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSignIn() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <BrandMark to={null} size="lg" />
        <p className="mt-3 text-sm text-stone-500">
          Keep the day steady — tasks, habits, and calendar in one place.
        </p>
        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={busy || loading}
          className="mt-6 w-full rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  )
}
