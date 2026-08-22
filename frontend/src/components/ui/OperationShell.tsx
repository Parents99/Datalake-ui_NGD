import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'

interface Props {
  title: string
  description?: string
  children: ReactNode
}

export function OperationShell({ title, description, children }: Props) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <PageHeader title={title} description={description} />

      {children}
    </div>
  )
}
