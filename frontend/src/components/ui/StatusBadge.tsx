type Status = 'mounted' | 'profiled' | 'new'

const styles: Record<Status, string> = {
  mounted:  'bg-green-50 text-green-600',
  profiled: 'bg-blue-50 text-blue-600',
  new:      'bg-gray-50 text-gray-600',
}

const labels: Record<Status, string> = {
  mounted:  'mounted',
  profiled: 'profiled',
  new:      'new',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
