import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import { adminDescribeSource } from '../../api/operations'
import { adminGetSources } from '../../api/sources'
import type { Source } from '../../api/sources'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OperationShell } from '../../components/ui/OperationShell'
import { SourceCombobox } from '../../components/ui/SourceCombobox'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { UserCombobox } from '../../components/ui/UserCombobox'
import { DescribeResults } from '../../features/describe/DescribeResults'
import {
  findInitialSource,
  normalizeDescribe,
  type DescribeResult,
} from '../../features/describe/describeUtils'
import { useAuth } from '../../hooks/useAuth'
import { useAdminUsers } from '../../hooks/useAdminUsers'

export default function AdminDescribe() {
  const [searchParams] = useSearchParams()
  const { username } = useAuth()
  const [sources, setSources] = useState<Source[]>([])
  const [selectedUsername, setSelectedUsername] = useState(searchParams.get('username') ?? username ?? 'admin')
  const [selectedSource, setSelectedSource] = useState('')
  const [loadedSource, setLoadedSource] = useState('')
  const [result, setResult] = useState<DescribeResult | null>(null)
  const [loadingSources, setLoadingSources] = useState(true)
  const [loadingDescribe, setLoadingDescribe] = useState(false)
  const [error, setError] = useState('')
  const autoRunRef = useRef('')
  const autoRunConsumedRef = useRef(false)
  const { users, loading: loadingUsers } = useAdminUsers(username ?? 'admin')

  useEffect(() => {
    let cancelled = false
    setLoadingSources(true)
    setResult(null)
    setLoadedSource('')
    setError('')
    adminGetSources(selectedUsername)
      .then((data) => {
        if (cancelled) return
        setSources(data)
        setSelectedSource(findInitialSource(data, searchParams.get('id')))
      })
      .catch((err) => {
        if (!cancelled) {
          setSources([])
          setSelectedSource('')
          setError(getApiErrorMessage(err, 'Unable to load sources for the selected user.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSources(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedUsername, searchParams])

  const handleLoadDescribe = async () => {
    if (!selectedSource) return

    const sourceIdentifier =
      sources.find((source) => source.name === selectedSource || source.id === selectedSource)?.id ?? selectedSource

    setLoadingDescribe(true)
    setError('')
    setResult(null)

    try {
      const data = await adminDescribeSource(sourceIdentifier, selectedUsername)
      setResult(normalizeDescribe(data))
      setLoadedSource(selectedSource)
    } catch (err) {
      setLoadedSource('')
      setResult(null)
      setError(getApiErrorMessage(err, 'Describe not available for this source.'))
    } finally {
      setLoadingDescribe(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('run') !== '1' || loadingSources || loadingDescribe || !selectedSource) return
    if (autoRunConsumedRef.current) return

    const autoRunKey = `${selectedUsername}:${selectedSource}`
    if (autoRunRef.current === autoRunKey) return

    autoRunConsumedRef.current = true
    autoRunRef.current = autoRunKey
    void handleLoadDescribe()
  }, [loadingDescribe, loadingSources, searchParams, selectedSource, selectedUsername])

  return (
    <OperationShell
      title="Describe"
      description="[admin] Source metadata and mapping to the Knowledge Graph"
    >
      <div className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-lg p-4 w-full lg:w-fit flex flex-col lg:flex-row lg:items-end gap-3">
          <UserCombobox
            users={users}
            value={selectedUsername}
            onChange={(nextUsername) => {
              setSelectedUsername(nextUsername)
              setError('')
            }}
            disabled={loadingUsers}
            className="w-full lg:w-56"
          />

          <SourceCombobox
            sources={sources}
            value={selectedSource}
            onChange={(nextSource) => {
              setSelectedSource(nextSource)
              setError('')
            }}
            disabled={loadingSources}
            accent="amber"
            className="w-full lg:w-[42rem]"
          />
          <LoadingButton
            type="button"
            onClick={handleLoadDescribe}
            loading={loadingDescribe}
            loadingLabel="Describe..."
            disabled={!selectedSource}
            className="w-full lg:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Describe
          </LoadingButton>
        </div>

        {error && (
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        )}

        <DescribeResults
          result={result}
          loading={loadingDescribe}
          loadedLabel={`Describe loaded: ${loadedSource || selectedSource} - user ${selectedUsername}`}
          emptyMessage="Select a user and source, then press Describe to view metadata."
        />
      </div>
    </OperationShell>
  )
}
