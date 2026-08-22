import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import { adminGetSources, adminGetUploads, adminMountSource, adminMountUploadedSource, adminRemountSource } from '../../api/sources'
import type { Source, UploadedSource } from '../../api/sources'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OperationShell } from '../../components/ui/OperationShell'
import { SourceCombobox } from '../../components/ui/SourceCombobox'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { UploadedSourceCombobox } from '../../components/ui/UploadedSourceCombobox'
import { UserCombobox } from '../../components/ui/UserCombobox'
import { useAuth } from '../../hooks/useAuth'
import { useAdminUsers } from '../../hooks/useAdminUsers'

type MountMode = 'local' | 'uploaded' | 'remount'

const modeDescriptions: Record<MountMode, string> = {
  local: 'Select a local CSV file and mount it directly in the Data Lake',
  uploaded: 'Mount a CSV file from pending sources',
  remount: 'Rebuild metadata for a source that is already mounted',
}

const isCsvFile = (value: File) =>
  value.name.toLowerCase().endsWith('.csv') || value.type === 'text/csv'

export default function AdminMount() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { username } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const initialUploaded = searchParams.get('uploaded') ?? ''
  const [mode, setMode] = useState<MountMode>(initialUploaded ? 'uploaded' : 'local')
  const [sources, setSources] = useState<Source[]>([])
  const [uploads, setUploads] = useState<UploadedSource[]>([])
  const [selectedUsername, setSelectedUsername] = useState(searchParams.get('username') ?? username ?? 'admin')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedUpload, setSelectedUpload] = useState(initialUploaded)
  const [file, setFile] = useState<File | null>(null)
  const [opts, setOpts] = useState({
    stringProcessing: true,
    maxCategories: 4,
    dateThreshold: 0.3,
    frequentWords: 10,
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const { users, loading: loadingUsers } = useAdminUsers(username ?? 'admin')

  useEffect(() => {
    Promise.allSettled([adminGetSources(selectedUsername), adminGetUploads(selectedUsername)])
      .then(([sourcesResult, uploadsResult]) => {
        if (sourcesResult.status === 'fulfilled') {
          setSources(sourcesResult.value)
          setSelectedSource(sourcesResult.value[0]?.name ?? '')
        } else {
          setSources([])
          setSelectedSource('')
          setStatus('error')
          setMessage(getApiErrorMessage(sourcesResult.reason, `Unable to load sources for user "${selectedUsername}".`))
        }

        if (uploadsResult.status === 'fulfilled') {
          setUploads(uploadsResult.value)
          setSelectedUpload((current) => current || uploadsResult.value[0]?.filename || '')
        } else {
          setUploads([])
          setSelectedUpload('')
          setStatus('error')
          setMessage(getApiErrorMessage(uploadsResult.reason, `Unable to load pending sources for user "${selectedUsername}".`))
        }

        if (sourcesResult.status === 'fulfilled' && uploadsResult.status === 'fulfilled' && status === 'error') {
          setStatus('idle')
          setMessage('')
        }
      })
  }, [selectedUsername])

  const resetFeedback = () => {
    setStatus('idle')
    setMessage('')
  }

  const handleMount = async () => {
    if (mode === 'local' && !file) return
    if (mode === 'uploaded' && !selectedUpload) return
    if (mode === 'remount' && !selectedSource) return
    if (mode === 'local' && file && !isCsvFile(file)) {
      setStatus('error')
      setMessage('Only CSV files can be mounted.')
      return
    }

    setStatus('loading')
    try {
      const res = mode === 'local'
        ? await adminMountSource(file as File, selectedUsername, opts)
        : mode === 'uploaded'
          ? await adminMountUploadedSource(selectedUpload, selectedUsername, opts)
          : await adminRemountSource(selectedSource, selectedUsername, opts)

      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMessage(res.message ?? (mode === 'remount' ? 'Remount completed.' : 'Mount completed.'))
      setStatus('done')
      const [nextSources, nextUploads] = await Promise.all([
        adminGetSources(selectedUsername),
        adminGetUploads(selectedUsername),
      ])
      setSources(nextSources)
      setUploads(nextUploads)
      if (mode === 'uploaded') {
        setSelectedUpload(nextUploads[0]?.filename ?? '')
      }
    } catch (err) {
      setMessage(getApiErrorMessage(err, mode === 'remount' ? 'Error during remount.' : 'Error during mount.'))
      setStatus('error')
    }
  }

  return (
    <OperationShell title="Mount" description="[admin] Mount or remount a source">
      <div className="bg-white border border-gray-100 rounded-xl p-5 lg:p-6 space-y-4 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="inline-flex w-fit rounded-lg border border-gray-200 p-1 bg-gray-50">
            {[
              { id: 'local' as const, label: 'Mount' },
              { id: 'uploaded' as const, label: 'Mount from pending' },
              { id: 'remount' as const, label: 'Remount' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id)
                  resetFeedback()
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === item.id ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <UserCombobox
            users={users}
            value={selectedUsername}
            onChange={(nextUsername) => {
              setSelectedUsername(nextUsername)
              resetFeedback()
            }}
            disabled={loadingUsers}
            className="w-full sm:w-64"
          />
        </div>

        <p className="text-sm text-gray-500 leading-6">{modeDescriptions[mode]}</p>

        {mode === 'local' ? (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Source file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] ?? null
                if (selectedFile && !isCsvFile(selectedFile)) {
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                  setStatus('error')
                  setMessage('Only CSV files can be mounted.')
                  return
                }
                setFile(selectedFile)
                resetFeedback()
              }}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                Choose file
              </button>
              <span className="min-w-0 truncate text-sm text-gray-500" title={file?.name ?? undefined}>
                {file?.name ?? 'No file selected'}
              </span>
            </div>
          </div>
        ) : mode === 'uploaded' ? (
          <div className="space-y-2">
            <UploadedSourceCombobox
              sources={uploads}
              value={selectedUpload}
              onChange={(nextUpload) => {
                setSelectedUpload(nextUpload)
                resetFeedback()
              }}
              accent="amber"
            />
            {uploads.length === 0 && (
              <p className="text-xs text-gray-400">No pending source available. Use Upload file in Sources first.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <SourceCombobox
              label="Existing source"
              sources={sources}
              value={selectedSource}
              onChange={(nextSource) => {
                setSelectedSource(nextSource)
                resetFeedback()
              }}
              accent="amber"
            />
            {sources.length === 0 && (
              <p className="text-xs text-gray-400">No mounted source available.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Max categories</label>
            <input
              type="number"
              value={opts.maxCategories}
              onChange={(e) => setOpts({ ...opts, maxCategories: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Date threshold</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={opts.dateThreshold}
              onChange={(e) => setOpts({ ...opts, dateThreshold: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Frequent words</label>
            <input
              type="number"
              value={opts.frequentWords}
              onChange={(e) => setOpts({ ...opts, frequentWords: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={opts.stringProcessing}
                onChange={(e) => setOpts({ ...opts, stringProcessing: e.target.checked })}
                className="rounded"
              />
              String processing
            </label>
          </div>
        </div>

        {status !== 'idle' && (
          <StatusMessage tone={status === 'loading' ? 'warning' : status === 'done' ? 'success' : 'error'}>
            {status === 'loading' ? `${mode === 'remount' ? 'Remount' : 'Mount'} in progress...` : message}
          </StatusMessage>
        )}

        <div className="flex gap-2">
          <LoadingButton
            onClick={handleMount}
            loading={status === 'loading'}
            loadingLabel="Loading..."
            disabled={mode === 'local' ? !file : mode === 'uploaded' ? !selectedUpload : !selectedSource}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {mode === 'remount' ? 'Remount' : 'Mount'}
          </LoadingButton>
          {status === 'done' && (
            <button
              onClick={() => navigate('/admin/sources')}
              className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
            >
              Go to sources
            </button>
          )}
        </div>
      </div>
    </OperationShell>
  )
}
