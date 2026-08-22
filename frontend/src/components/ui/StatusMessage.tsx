import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'error' | 'warning' | 'loading'

interface Props {
  tone?: Tone
  children: ReactNode
  className?: string
}

const toneClasses: Record<Tone, string> = {
  info: 'bg-gray-50 border-gray-100 text-gray-600',
  success: 'bg-green-50 border-green-100 text-green-700',
  error: 'bg-red-50 border-red-100 text-red-700',
  warning: 'bg-amber-50 border-amber-100 text-amber-700',
  loading: 'bg-blue-50 border-blue-100 text-blue-700',
}

export function StatusMessage({ tone = 'info', children, className = '' }: Props) {
  return (
    <div className={`px-4 py-3 rounded-lg text-sm border ${toneClasses[tone]} ${className}`}>
      {children}
    </div>
  )
}
