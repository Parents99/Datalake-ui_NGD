import { useRef, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { uploadSource } from '../../api/sources'
import { LoadingButton } from './LoadingButton'
import { StatusMessage } from './StatusMessage'

interface Props {
  open: boolean
  accent?: 'blue' | 'amber'
  uploadFile?: (file: File) => Promise<{ message: string }>
  onClose: () => void
  onUploaded: (message: string) => void
}

const isCsvFile = (value: File) =>
  value.name.toLowerCase().endsWith('.csv') || value.type === 'text/csv'

export function UploadSourceDialog({
  open,
  accent = 'blue',
  uploadFile = uploadSource,
  onClose,
  onUploaded,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setFile(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const close = () => {
    if (uploading) return
    reset()
    onClose()
  }

  const handleFileChange = (selectedFile: File | null) => {
    setError('')
    if (selectedFile && !isCsvFile(selectedFile)) {
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setError('Only CSV files can be uploaded.')
      return
    }
    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Select a CSV file to upload.')
      return
    }

    setUploading(true)
    setError('')
    try {
      const res = await uploadFile(file)
      reset()
      onUploaded(res.message)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error while uploading the source.'))
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  const confirmClass = accent === 'amber'
    ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white'
    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/25 px-4">
      <div className="w-full max-w-md rounded-lg bg-white border border-gray-100 shadow-xl p-5">
        <div className="space-y-2">
          <h2 className="text-base font-medium text-gray-900">Upload source</h2>
          <p className="text-sm text-gray-500 leading-6">
            Upload a CSV file to the server. The source will appear as pending until it is mounted.
          </p>
        </div>

        <div className="mt-5">
          <label className="block text-xs text-gray-500 mb-1.5">Source file</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 disabled:text-gray-300 transition-colors"
            >
              Choose file
            </button>
            <span className="min-w-0 truncate text-sm text-gray-500" title={file?.name ?? undefined}>
              {file?.name ?? 'No file selected'}
            </span>
          </div>
        </div>

        {error && (
          <StatusMessage tone="error" className="mt-4">
            {error}
          </StatusMessage>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={uploading}
            className="px-3 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:text-gray-300 disabled:bg-white transition-colors"
          >
            Cancel
          </button>
          <LoadingButton
            type="button"
            onClick={handleUpload}
            loading={uploading}
            loadingLabel="Uploading..."
            disabled={!file}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${confirmClass}`}
          >
            Upload
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
