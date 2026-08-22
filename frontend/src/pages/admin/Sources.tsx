import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import { adminDeleteUploadedSource, adminGetSources, adminGetUploads, adminUnmountSource, adminUploadSource } from '../../api/sources'
import type { Source, UploadedSource } from '../../api/sources'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DatasetCard } from '../../components/ui/DatasetCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { UploadSourceDialog } from '../../components/ui/UploadSourceDialog'
import { UploadedSourceCard } from '../../components/ui/UploadedSourceCard'
import { UserCombobox } from '../../components/ui/UserCombobox'
import { useAuth } from '../../hooks/useAuth'
import { useAdminUsers } from '../../hooks/useAdminUsers'

type ConfirmAction =
  | { type: 'unmount'; source: Source }
  | { type: 'delete-upload'; source: UploadedSource }
  | null

function SectionToggle({
  title,
  collapsed,
  onToggle,
}: {
  title: string
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 border-r border-b border-gray-400 transition-transform ${
          collapsed ? '-rotate-45' : 'rotate-45 -translate-y-0.5'
        }`}
      />
      {title}
    </button>
  )
}

export default function AdminSources() {
  const navigate = useNavigate()
  const { username } = useAuth()
  const [sources, setSources] = useState<Source[]>([])
  const [uploads, setUploads] = useState<UploadedSource[]>([])
  const [query, setQuery] = useState('')
  const [selectedUsername, setSelectedUsername] = useState(username ?? 'admin')
  const [loading, setLoading] = useState(true)
  const [unmountingSource, setUnmountingSource] = useState('')
  const [deletingUpload, setDeletingUpload] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({ mounted: false, uploaded: false })
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [message, setMessage] = useState('')
  const { users, loading: loadingUsers } = useAdminUsers(username ?? 'admin')

  const load = () => {
    setLoading(true)
    Promise.allSettled([adminGetSources(selectedUsername), adminGetUploads(selectedUsername)])
      .then(([sourcesResult, uploadsResult]) => {
        if (sourcesResult.status === 'fulfilled') {
          setSources(sourcesResult.value)
        } else {
          setSources([])
          setMessage(getApiErrorMessage(sourcesResult.reason, `Unable to load sources for user "${selectedUsername}".`))
        }

        if (uploadsResult.status === 'fulfilled') {
          setUploads(uploadsResult.value)
        } else {
          setUploads([])
          setMessage(getApiErrorMessage(uploadsResult.reason, `Unable to load pending sources for user "${selectedUsername}".`))
        }

        if (sourcesResult.status === 'fulfilled' && uploadsResult.status === 'fulfilled') {
          setMessage('')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [selectedUsername])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return sources.filter((source) => {
      return (
        normalizedQuery === '' ||
        source.name.toLowerCase().includes(normalizedQuery) ||
        source.displayName?.toLowerCase().includes(normalizedQuery) ||
        source.uri?.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, sources])

  const uploadResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return uploads.filter((source) => {
      return (
        normalizedQuery === '' ||
        source.name.toLowerCase().includes(normalizedQuery) ||
        source.displayName.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, uploads])

  const handleUnmount = async (source: Source) => {
    setUnmountingSource(source.id)
    setMessage('')
    try {
      await adminUnmountSource(source.name, selectedUsername)
      load()
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Error while unmounting the source.'))
    } finally {
      setUnmountingSource('')
      setConfirmAction(null)
    }
  }

  const handleDeleteUpload = async (source: UploadedSource) => {
    setDeletingUpload(source.id)
    setMessage('')
    try {
      const res = await adminDeleteUploadedSource(source.filename, selectedUsername)
      setMessage(res.message)
      load()
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Error while deleting the pending source.'))
    } finally {
      setDeletingUpload('')
      setConfirmAction(null)
    }
  }

  const confirmTitle = confirmAction?.type === 'delete-upload' ? 'Delete pending source' : 'Unmount source'

  const confirmDescription = confirmAction?.type === 'delete-upload'
    ? `Confirm deletion of pending source "${confirmAction.source.displayName}" for user "${selectedUsername}"?`
    : `Confirm unmount of source "${confirmAction?.source.displayName ?? confirmAction?.source.name ?? ''}"?`

  const confirmLabel = confirmAction?.type === 'delete-upload' ? 'Delete' : 'Unmount'
  const confirming =
    (confirmAction?.type === 'unmount' && unmountingSource === confirmAction.source.id) ||
    (confirmAction?.type === 'delete-upload' && deletingUpload === confirmAction.source.id)

  const toggleSection = (section: 'mounted' | 'uploaded') => {
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <PageHeader
        title="Sources"
        description="Sources loaded in the Data Lake"
        actions={(
          <div className="flex items-end gap-2">
            <UserCombobox
              users={users}
              value={selectedUsername}
              onChange={(nextUsername) => {
                setSelectedUsername(nextUsername)
                setMessage('')
              }}
              className="min-w-48"
              disabled={loadingUsers}
            />
            <LoadingButton
              onClick={() => setUploadDialogOpen(true)}
              loading={false}
              className="h-[38px] self-end px-4 border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 text-sm font-medium rounded-lg transition-colors"
            >
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
                  <path d="M10 12V4M6.5 7.5 10 4l3.5 3.5M4.5 13.5v2h11v-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Upload file
              </span>
            </LoadingButton>
          </div>
        )}
      />

      {message && (
        <StatusMessage tone="info" className="mb-4">
          {message}
        </StatusMessage>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 w-full md:w-fit">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-full md:w-[42rem]">
            <label className="block text-xs text-gray-500 mb-1.5">Source name</label>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or URI"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : sources.length === 0 && uploads.length === 0 ? (
        <EmptyState message="No source available." />
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">
            {results.length === 1 ? '1 mounted source' : `${results.length} mounted sources`}
            {' - '}
            {uploadResults.length === 1 ? '1 pending source' : `${uploadResults.length} pending sources`}
          </p>
          {results.length > 0 && (
            <section className="mb-6">
              <SectionToggle
                title="Mounted sources"
                collapsed={collapsedSections.mounted}
                onToggle={() => toggleSection('mounted')}
              />
              {!collapsedSections.mounted && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {results.map((source) => (
                    <DatasetCard
                      key={source.id}
                      source={source}
                      onDescribe={() => navigate(`/admin/describe?id=${encodeURIComponent(source.name)}&username=${encodeURIComponent(selectedUsername)}&run=1`)}
                      onProfile={() => navigate(`/admin/profile?id=${encodeURIComponent(source.name)}&username=${encodeURIComponent(selectedUsername)}&run=1`)}
                      onUnmount={() => setConfirmAction({ type: 'unmount', source })}
                      unmounting={unmountingSource === source.id}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
          {uploadResults.length > 0 && (
            <section>
              <SectionToggle
                title="Pending sources"
                collapsed={collapsedSections.uploaded}
                onToggle={() => toggleSection('uploaded')}
              />
              {!collapsedSections.uploaded && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {uploadResults.map((source) => (
                    <UploadedSourceCard
                      key={source.id}
                      source={source}
                      onMount={() => navigate(`/admin/mount?uploaded=${encodeURIComponent(source.filename)}&username=${encodeURIComponent(selectedUsername)}`)}
                      onDelete={() => setConfirmAction({ type: 'delete-upload', source })}
                      deleting={deletingUpload === source.id}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
          {results.length === 0 && uploadResults.length === 0 && (
            <EmptyState message="No source matches the selected filters." className="py-16" />
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        tone="danger"
        loading={confirming}
        onCancel={() => {
          if (!confirming) setConfirmAction(null)
        }}
        onConfirm={() => {
          if (confirmAction?.type === 'unmount') {
            void handleUnmount(confirmAction.source)
          } else if (confirmAction?.type === 'delete-upload') {
            void handleDeleteUpload(confirmAction.source)
          }
        }}
      />

      <UploadSourceDialog
        open={uploadDialogOpen}
        accent="amber"
        uploadFile={(file) => adminUploadSource(file, selectedUsername)}
        onClose={() => setUploadDialogOpen(false)}
        onUploaded={(uploadMessage) => {
          setMessage(uploadMessage)
          load()
        }}
      />
    </div>
  )
}
