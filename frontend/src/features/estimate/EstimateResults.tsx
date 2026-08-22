import { DataTable, DataTableCell, DataTableEmpty, DataTableHeader } from '../../components/ui/DataTable'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { shortName, type EstimateResult } from './estimateUtils'

export function EstimateResults({
  result,
  showLoadBy = false,
}: {
  result: EstimateResult
  showLoadBy?: boolean
}) {
  if (Array.isArray(result)) {
    return (
      <DataTable>
          <thead>
            <tr className="border-b border-gray-100">
              <DataTableHeader>Common level</DataTableHeader>
              <DataTableHeader numeric>Similarity</DataTableHeader>
              <DataTableHeader>Comparison</DataTableHeader>
            </tr>
          </thead>
          <tbody>
            {result.map((row, index) => (
              <tr
                key={`${row.level}-${index}`}
                className={`${index < result.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/70 transition-colors`}
              >
                <DataTableCell strong>{shortName(row.level)}</DataTableCell>
                <DataTableCell numeric>{row.similarity}%</DataTableCell>
                <DataTableCell className="break-words">
                  {row.comparison
                    .map((item) => {
                      const label = shortName(item.domain || item.source)
                      return showLoadBy && item.loadBy ? `${item.loadBy}: ${label}` : label
                    })
                    .join(' / ')}
                </DataTableCell>
              </tr>
            ))}
            {result.length === 0 && (
              <DataTableEmpty colSpan={3}>No common level found.</DataTableEmpty>
            )}
          </tbody>
      </DataTable>
    )
  }

  if (typeof result === 'string') {
    return (
      <StatusMessage tone="info">
        {result}
      </StatusMessage>
    )
  }

  return null
}
