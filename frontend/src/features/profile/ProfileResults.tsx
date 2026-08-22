import { lazy, Suspense, useMemo, useState } from 'react'
import { DataTable, DataTableCell, DataTableHeader } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { MetricCard, MetricGrid } from '../../components/ui/MetricCard'
import { StatusMessage } from '../../components/ui/StatusMessage'
import {
  frequencySeries,
  formatValue,
  inferKind,
  isFrequencyList,
  isRecord,
  KIND_FILTERS,
  kindLabel,
  matchesKindFilter,
  profileFieldLabel,
  scalarEntries,
  seriesEntries,
  shortName,
  TOP_N_OPTIONS,
  type FullProfileEntry,
  type ProfileKindFilter,
} from './profileUtils'

const MAX_CHART_ITEMS = 25
const ProfileSeriesChart = lazy(() => import('./ProfileSeriesChart'))

const sortByOccurrencesDesc = <T extends { occurrences: number }>(items: T[]) =>
  [...items].sort((left, right) => right.occurrences - left.occurrences)

function ChartIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
      <path d="M4 15V9.5M10 15V5M16 15v-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 16h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
      <path d="M4 5.5h12M4 10h12M4 14.5h12M8 5v10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ProfileCard({
  entry,
  topN,
  accent,
  collapsed,
  onToggle,
}: {
  entry: FullProfileEntry
  topN: number
  accent: 'blue' | 'amber'
  collapsed: boolean
  onToggle: () => void
}) {
  const [chartSeries, setChartSeries] = useState<Set<string>>(new Set())
  const kind = isRecord(entry.profile) ? inferKind(entry.domain, entry.profile) : 'generic'
  const scalars = isRecord(entry.profile) ? scalarEntries(entry.profile) : []
  const series = [
    ...(isRecord(entry.profile) ? seriesEntries(entry.profile) : []),
    ...(isFrequencyList(entry.profile) ? [frequencySeries('profile', entry.profile)] : []),
    ...(entry.rollUp && entry.rollUp.length > 0 ? [frequencySeries('rollUp', entry.rollUp)] : []),
  ]

  const toggleSeriesView = (key: string) => {
    setChartSeries((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <span className="block text-sm font-medium text-gray-900 break-all">{shortName(entry.domain)}</span>
          <span className="block text-xs text-gray-400 mt-1 break-all">{entry.domain}</span>
        </div>
        <span className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-1 rounded-md bg-gray-50 text-[11px] font-medium text-gray-500">
            {kindLabel(kind)}
          </span>
          <span
            aria-hidden="true"
            className={`h-2 w-2 border-r border-b border-gray-400 transition-transform ${
              collapsed ? 'rotate-45 translate-y-[-2px]' : 'rotate-[225deg] translate-y-0.5'
            }`}
          />
        </span>
      </button>

      {!collapsed && scalars.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {scalars.map(([key, value]) => (
            <div key={key} className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-[11px] text-gray-400 mb-1">{profileFieldLabel(key)}</p>
              <p className="text-sm font-medium text-gray-800 leading-5 break-all">{formatValue(value)}</p>
            </div>
          ))}
        </div>
      )}

      {!collapsed && series.map((serie) => {
        const sortedItems = sortByOccurrencesDesc(serie.items)
        const visibleItems = sortedItems.slice(0, topN)
        const chartItems = sortedItems.slice(0, Math.min(topN, MAX_CHART_ITEMS))
        const isChartView = chartSeries.has(serie.key)

        return (
          <div key={serie.key}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500">{serie.key}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSeriesView(serie.key)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                  title={isChartView ? 'Show table' : 'Show bar chart'}
                  aria-label={isChartView ? 'Show table' : 'Show bar chart'}
                >
                  {isChartView ? <TableIcon /> : <ChartIcon />}
                  {isChartView ? 'Table' : 'Chart'}
                </button>
                <p className="text-[11px] text-gray-400">
                  Showing {Math.min(topN, sortedItems.length)} of {serie.total.toLocaleString()}
                </p>
              </div>
            </div>
            {isChartView ? (
              <Suspense
                fallback={(
                  <div className="h-80 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-4 text-sm text-gray-400">
                    Loading chart...
                  </div>
                )}
              >
                <ProfileSeriesChart items={chartItems} accent={accent} />
              </Suspense>
            ) : (
              <DataTable className="table-fixed">
                <thead>
                  <tr className="border-b border-gray-100">
                    <DataTableHeader className="px-3 py-2 text-[11px] w-2/3">Item</DataTableHeader>
                    <DataTableHeader className="px-3 py-2 text-[11px] w-1/3">Occurrences</DataTableHeader>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item, index) => (
                    <tr
                      key={`${serie.key}-${index}`}
                      className={`${index < visibleItems.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/70 transition-colors`}
                    >
                      <DataTableCell className="px-3 py-2 break-all">{shortName(item.item)}</DataTableCell>
                      <DataTableCell className="px-3 py-2 tabular-nums">{item.occurrences.toLocaleString()}</DataTableCell>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        )
      })}

      {!collapsed && entry.profile === null && (
        <div className="text-sm text-gray-400">Profile not available for this domain.</div>
      )}

      {!collapsed && entry.profile !== null && scalars.length === 0 && series.length === 0 && (
        <div className="text-sm text-gray-400">Profile format not recognized for this domain.</div>
      )}
    </div>
  )
}

export function ProfileResults({
  profile,
  topN,
  onTopNChange,
  loading,
  loadedLabel,
  emptyMessage,
  accent = 'blue',
}: {
  profile: FullProfileEntry[]
  topN: number
  onTopNChange: (value: number) => void
  loading: boolean
  loadedLabel: string
  emptyMessage: string
  accent?: 'blue' | 'amber'
}) {
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set())
  const [kindFilter, setKindFilter] = useState<ProfileKindFilter>('all')

  const stats = useMemo(() => {
    const kinds = profile.reduce<Record<string, number>>((acc, entry) => {
      const kind = isRecord(entry.profile) ? inferKind(entry.domain, entry.profile) : 'generic'
      acc[kind] = (acc[kind] ?? 0) + 1
      return acc
    }, {})

    return {
      domains: profile.length,
      numeric: (kinds.numeric ?? 0) + (kinds.integer ?? 0),
      categorical: kinds.categorical ?? 0,
      text: kinds.text ?? 0,
      date: kinds.date ?? 0,
    }
  }, [profile])

  const filteredProfile = useMemo(() => (
    profile.filter((entry) => matchesKindFilter(isRecord(entry.profile) ? inferKind(entry.domain, entry.profile) : 'generic', kindFilter))
  ), [kindFilter, profile])

  const activeClass = accent === 'amber'
    ? 'bg-amber-500 border-amber-500 text-white'
    : 'bg-blue-600 border-blue-600 text-white'
  const topNFocusClass = accent === 'amber'
    ? 'focus:ring-amber-500/20 focus:border-amber-400'
    : 'focus:ring-blue-500/20 focus:border-blue-400'

  const toggleDomain = (domain: string) => {
    setCollapsedDomains((current) => {
      const next = new Set(current)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  if (loading) return <StatusMessage tone="loading">Loading profile...</StatusMessage>

  if (profile.length === 0) {
    return <EmptyState message={emptyMessage} className="py-8" />
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs text-gray-400">{loadedLabel}</p>
        <MetricGrid>
          {[
            { label: 'Domains', value: stats.domains },
            { label: 'Numeric', value: stats.numeric },
            { label: 'Categorical', value: stats.categorical },
            { label: 'Text', value: stats.text },
            { label: 'Date', value: stats.date },
          ].map((item) => (
            <MetricCard key={item.label} label={item.label} value={item.value} accent={accent} />
          ))}
        </MetricGrid>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {KIND_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setKindFilter(filter.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  kindFilter === filter.id
                    ? activeClass
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-medium text-gray-500">Top</label>
            <select
              value={topN}
              onChange={(event) => onTopNChange(Number(event.target.value))}
              className={`w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 ${topNFocusClass}`}
            >
              {TOP_N_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredProfile.map((entry) => (
          <ProfileCard
            key={entry.domain}
            entry={entry}
            topN={topN}
            accent={accent}
            collapsed={collapsedDomains.has(entry.domain)}
            onToggle={() => toggleDomain(entry.domain)}
          />
        ))}
        {filteredProfile.length === 0 && (
          <EmptyState message="No domain matches the selected filter." className="py-8" />
        )}
      </div>
    </>
  )
}
