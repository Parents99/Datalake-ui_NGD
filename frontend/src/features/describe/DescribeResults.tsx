import { DataTable, DataTableCell, DataTableEmpty, DataTableHeader } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { MetricCard, MetricGrid } from '../../components/ui/MetricCard'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { describeStats, shortName, type DescribeResult } from './describeUtils'

export function DescribeResults({
  result,
  loading,
  loadedLabel,
  emptyMessage,
}: {
  result: DescribeResult | null
  loading: boolean
  loadedLabel: string
  emptyMessage: string
}) {
  if (loading) return <StatusMessage tone="loading">Loading describe...</StatusMessage>

  if (!result) return <EmptyState message={emptyMessage} className="py-8" />

  const { domains, mappedDomains } = describeStats(result)
  const uri = result.name ?? result.source ?? '-'

  return (
    <>
      <p className="text-xs text-gray-400">{loadedLabel}</p>

      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(10rem,0.75fr)_minmax(7rem,0.45fr)_minmax(9.5rem,0.65fr)_minmax(16rem,1.35fr)] gap-x-9 gap-y-4 text-sm">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Name</p>
            <p className="font-medium text-gray-900 break-all">{shortName(result.name ?? result.source)}</p>
          </div>
          <div className="min-w-fit">
            <p className="text-xs text-gray-500 mb-1">Loaded by</p>
            <p className="font-medium text-gray-900">{result.loadBy ?? '-'}</p>
          </div>
          <div className="min-w-fit">
            <p className="text-xs text-gray-500 mb-1">Load date</p>
            <p className="font-medium text-gray-900">{result.loadingDate ?? '-'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">URI</p>
            <p className="font-medium text-gray-900 truncate" title={uri}>{uri}</p>
          </div>
        </div>
      </div>

      <MetricGrid>
        {[
          { label: 'Items', value: result.numItems ?? '-' },
          { label: 'Domains', value: result.numDomains ?? domains.length },
          { label: 'Mapped', value: result.numMappedDomains ?? mappedDomains },
        ].map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} />
        ))}
      </MetricGrid>

      <DataTable>
          <thead>
            <tr className="border-b border-gray-100">
              <DataTableHeader>Domain</DataTableHeader>
              <DataTableHeader>Type / mapping</DataTableHeader>
              <DataTableHeader numeric>Completeness</DataTableHeader>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain, index) => (
              <tr
                key={`${domain.domain}-${index}`}
                className={`${index < domains.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/70 transition-colors`}
              >
                <DataTableCell strong className="break-all">{shortName(domain.domain)}</DataTableCell>
                <DataTableCell className="break-all">
                  {'mapTo' in domain ? shortName(domain.mapTo) : domain.type}
                </DataTableCell>
                <DataTableCell numeric>
                  {'completeness' in domain ? domain.completeness : '-'}
                </DataTableCell>
              </tr>
            ))}
            {domains.length === 0 && (
              <DataTableEmpty colSpan={3}>No domains in describe response.</DataTableEmpty>
            )}
          </tbody>
      </DataTable>
    </>
  )
}
