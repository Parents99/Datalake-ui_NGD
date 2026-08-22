import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { LoadingButton } from '../components/ui/LoadingButton'
import { StatusMessage } from '../components/ui/StatusMessage'
import { useAuth } from '../hooks/useAuth'

type AuthMode = 'login' | 'signin'
type AuthInputIcon = 'user' | 'lock'

const SIGNIN_USERNAME_PATTERN = /^[A-Za-z]+$/

function AuthInput({
  icon,
  type,
  value,
  onChange,
  placeholder,
}: {
  icon: AuthInputIcon
  type: 'text' | 'password'
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon === 'user' ? (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M5 20c1.4-3.2 3.7-5 7-5s5.6 1.8 7 5" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        )}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        className="w-full h-11 pl-10 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors placeholder:text-gray-400"
      />
    </div>
  )
}

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, signin, isAuthenticated, role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate(role === 'admin' ? '/admin/sources' : '/app/sources', { replace: true })
    }
  }, [isAuthenticated, role, navigate])

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'signin' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (mode === 'signin' && !SIGNIN_USERNAME_PATTERN.test(username)) {
      setError('Invalid username: use letters only, without spaces, numbers, or symbols.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signin') {
        await signin(username, password, confirmPassword)
      } else {
        await login(username, password)
      }
    } catch (err) {
      setError(getApiErrorMessage(
        err,
        mode === 'signin'
          ? 'Sign up failed. Please try again.'
          : 'Invalid credentials. Please try again.',
      ))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base font-semibold leading-none">
            <span className="block -translate-y-px">SDL</span>
          </div>
          <span className="text-xl font-medium text-gray-900">Semantic Data Lake</span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 lg:p-10 shadow-sm">
          <div className="inline-flex w-full rounded-lg border border-gray-200 p-1 bg-gray-50 mb-6">
            {[
              { id: 'login' as const, label: 'Login' },
              { id: 'signin' as const, label: 'Create account' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => switchMode(item.id)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === item.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === 'signin' && (
            <h1 className="text-[15px] font-medium text-gray-900 mb-6">
              Create a new user
            </h1>
          )}

          {error && (
            <StatusMessage tone="error" className="mb-4">
              {error}
            </StatusMessage>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthInput
              icon="user"
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="Username"
            />

            <AuthInput
              icon="lock"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Password"
            />

            {mode === 'signin' && (
              <AuthInput
                icon="lock"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm password"
              />
            )}

            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel={mode === 'signin' ? 'Signing up...' : 'Logging in...'}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors mt-2"
            >
              {mode === 'signin' ? 'Create account' : 'Login'}
            </LoadingButton>
          </form>
        </div>
      </div>
    </div>
  )
}
