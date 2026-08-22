import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: ReactNode
  accent?: 'blue' | 'amber' | 'gray'
}

interface MetricGridProps {
  children: ReactNode
  minWidth?: number
}

const accentClasses = {
  blue: 'border-gray-100 bg-white',
  amber: 'border-gray-100 bg-white',
  gray: 'border-gray-100 bg-white',
}

export function MetricGrid({ children, minWidth = 110 }: MetricGridProps) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` }}
    >
      {children}
    </div>
  )
}

export function MetricCard({ label, value, accent = 'gray' }: MetricCardProps) {
  return (
    <div className={`rounded-lg border px-3 py-3 ${accentClasses[accent]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-medium text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}
