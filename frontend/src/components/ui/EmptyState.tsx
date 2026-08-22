interface Props {
  message: string
  className?: string
}

export function EmptyState({ message, className = '' }: Props) {
  return (
    <div className={`text-center py-12 text-gray-400 text-sm ${className}`}>
      {message}
    </div>
  )
}
