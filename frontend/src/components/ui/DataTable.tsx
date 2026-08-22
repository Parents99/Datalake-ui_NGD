import type { ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode
}

interface DataTableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
  numeric?: boolean
  strong?: boolean
}

interface DataTableHeaderProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
  numeric?: boolean
}

export function DataTable({ children, className = '', ...props }: DataTableProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-auto">
      <table {...props} className={`w-full text-sm ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function DataTableHeader({ children, numeric = false, className = '', ...props }: DataTableHeaderProps) {
  return (
    <th
      {...props}
      className={`px-4 py-3 text-xs font-medium text-gray-500 bg-gray-50 ${numeric ? 'text-right' : 'text-left'} ${className}`}
    >
      {children}
    </th>
  )
}

export function DataTableCell({
  children,
  numeric = false,
  strong = false,
  className = '',
  ...props
}: DataTableCellProps) {
  return (
    <td
      {...props}
      className={`px-4 py-3 align-top ${numeric ? 'text-right tabular-nums' : ''} ${
        strong ? 'font-medium text-gray-900' : 'text-gray-600'
      } ${className}`}
    >
      {children}
    </td>
  )
}

export function DataTableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-400">
        {children}
      </td>
    </tr>
  )
}
