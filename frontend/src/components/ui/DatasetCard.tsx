import type { Source } from '../../api/sources'
import { LoadingButton } from './LoadingButton'
import { StatusBadge } from './StatusBadge'

interface Props {
  source: Source
  onDescribe?: () => void
  onProfile?: () => void
  onUnmount?: () => void
  unmounting?: boolean
}

export function DatasetCard({ source, onDescribe, onProfile, onUnmount, unmounting = false }: Props) {
  const label = source.displayName ?? source.name
  const uri = source.uri && source.uri !== label ? source.uri : null

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <span className="block text-sm font-medium text-gray-900 break-all">{label}</span>
          {uri && (
            <span className="block mt-1 text-[11px] text-gray-500 truncate" title={uri}>
              {uri}
            </span>
          )}
        </div>
        <StatusBadge status={source.status} />
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-3 min-w-0">
        {source.year && (
          <span className="shrink-0">{source.year}</span>
        )}
      </div>
      <div className="flex gap-2">
        {onDescribe && (
          <button
            onClick={onDescribe}
            className="text-[11px] px-2.5 py-1 border border-blue-200 rounded-md text-blue-700 bg-blue-50/40 hover:bg-blue-50 font-medium transition-colors"
          >
            Describe
          </button>
        )}
        {onProfile && (
          <button
            onClick={onProfile}
            className="text-[11px] px-2.5 py-1 border border-indigo-300 rounded-md text-indigo-700 bg-indigo-50/40 hover:bg-indigo-50 font-medium transition-colors"
          >
            Profile
          </button>
        )}
        {onUnmount && (
          <LoadingButton
            onClick={onUnmount}
            loading={unmounting}
            loadingLabel="Unmount..."
            className="text-[11px] px-2.5 py-1 border border-red-300 rounded-md text-red-600 hover:bg-red-50 disabled:text-red-300 disabled:bg-white font-medium transition-colors"
          >
            Unmount
          </LoadingButton>
        )}
      </div>
    </div>
  )
}
