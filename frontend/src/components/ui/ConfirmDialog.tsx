import { LoadingButton } from './LoadingButton'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  const confirmClass = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white'
    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/25 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white border border-gray-100 shadow-xl p-5">
        <div className="space-y-2">
          <h2 className="text-base font-medium text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 leading-6">{description}</p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:text-gray-300 disabled:bg-white transition-colors"
          >
            {cancelLabel}
          </button>
          <LoadingButton
            type="button"
            onClick={onConfirm}
            loading={loading}
            loadingLabel="Operation..."
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
