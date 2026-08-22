import type { UploadedSource } from '../../api/sources'
import { LoadingButton } from './LoadingButton'

interface Props {
  source: UploadedSource
  onMount?: () => void
  onDelete?: () => void
  deleting?: boolean
}

export function UploadedSourceCard({ source, onMount, onDelete, deleting = false }: Props) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <span className="block text-sm font-medium text-gray-900 break-all">{source.displayName}</span>
          {source.name !== source.displayName && (
            <span className="block mt-1 text-[11px] text-gray-500 truncate" title={source.name}>
              {source.name}
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
          pending
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onMount}
          disabled={!onMount}
          className="text-[11px] px-2.5 py-1 border border-blue-200 rounded-md text-blue-700 bg-blue-50/40 hover:bg-blue-50 disabled:text-blue-300 disabled:bg-white font-medium transition-colors"
        >
          Mount
        </button>
        <LoadingButton
          onClick={onDelete}
          loading={deleting}
          loadingLabel="Delete..."
          disabled={!onDelete}
          className="text-[11px] px-2.5 py-1 border border-red-300 rounded-md text-red-600 hover:bg-red-50 disabled:text-red-300 disabled:bg-white font-medium transition-colors"
        >
          Delete
        </LoadingButton>
      </div>
    </div>
  )
}
