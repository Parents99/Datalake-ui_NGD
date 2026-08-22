import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { type FrequencyItem, formatValue, shortName } from './profileUtils'

const truncateLabel = (value: string, maxLength = 16) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value

export default function ProfileSeriesChart({
  items,
  accent,
}: {
  items: FrequencyItem[]
  accent: 'blue' | 'amber'
}) {
  const chartData = items.map((item) => {
    const fullLabel = formatValue(item.item)
    return {
      label: truncateLabel(shortName(item.item), 14),
      fullLabel,
      occurrences: item.occurrences,
    }
  })

  const barColor = accent === 'amber' ? '#f59e0b' : '#2563eb'
  const barGap = chartData.length <= 6 ? '55%' : '35%'

  return (
    <div className="h-80 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 6, right: 10, left: 0, bottom: 34 }} barCategoryGap={barGap}>
          <CartesianGrid stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={46}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ fill: 'rgba(229, 231, 235, 0.45)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const data = payload[0].payload as { fullLabel: string; occurrences: number }
              return (
                <div className="max-w-xs rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
                  <p className="text-xs font-medium text-gray-900 break-all">{data.fullLabel}</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Occurrences: <span className="font-medium text-gray-800">{data.occurrences.toLocaleString()}</span>
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="occurrences" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
