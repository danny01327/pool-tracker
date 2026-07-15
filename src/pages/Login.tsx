import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import AppLogo from '../components/AppLogo'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else if (mode === 'signup') {
      setInfo('Check your email to confirm your account, then sign in.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="max-w-sm w-full space-y-4">
        <div className="text-center">
          <AppLogo heightClass="h-20" />
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400">
          {mode === 'signin' ? 'Sign in to your account.' : 'Create an account to get started.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          {info && <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            setError(null)
            setInfo(null)
          }}
          className="w-full text-center text-sm text-sky-700 dark:text-sky-400 underline"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
