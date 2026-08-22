import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { adminEstimateSources } from '../../api/operations'
import { adminGetSources } from '../../api/sources'
import type { Source } from '../../api/sources'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OperationShell } from '../../components/ui/OperationShell'
import { SourceCombobox } from '../../components/ui/SourceCombobox'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { UserCombobox } from '../../components/ui/UserCombobox'
import { EstimateResults } from '../../features/estimate/EstimateResults'
import { normalizeEstimate, type EstimateResult } from '../../features/estimate/estimateUtils'
import { useAuth } from '../../hooks/useAuth'
import { useAdminUsers } from '../../hooks/useAdminUsers'

export default function AdminEstimate() {
  const { username } = useAuth()
  const [usernameA, setUsernameA] = useState(username ?? 'admin')
  const [usernameB, setUsernameB] = useState(username ?? 'admin')
  const [sourcesA, setSourcesA] = useState<Source[]>([])
  const [sourcesB, setSourcesB] = useState<Source[]>([])
  const [sourceA, setSourceA] = useState('')
  const [sourceB, setSourceB] = useState('')
  const [result, setResult] = useState<EstimateResult>(null)
  const [estimating, setEstimating] = useState(false)
  const [error, setError] = useState('')
  const { users, loading: loadingUsers } = useAdminUsers(username ?? 'admin')

  useEffect(() => {
    adminGetSources(usernameA)
      .then((data) => {
        setSourcesA(data)
        setSourceA(data[0]?.name ?? '')
        setError('')
      })
      .catch((err) => {
        setSourcesA([])
        setSourceA('')
        setError(getApiErrorMessage(err, `Unable to load sources for user "${usernameA}".`))
      })
  }, [usernameA])

  useEffect(() => {
    adminGetSources(usernameB)
      .then((data) => {
        setSourcesB(data)
        setSourceB(data[0]?.name ?? '')
        setError('')
      })
      .catch((err) => {
        setSourcesB([])
        setSourceB('')
        setError(getApiErrorMessage(err, `Unable to load sources for user "${usernameB}".`))
      })
  }, [usernameB])

  const canEstimate =
    sourceA !== '' &&
    sourceB !== '' &&
    sourceA !== sourceB

  const handleEstimate = async () => {
    if (!canEstimate) return
    setEstimating(true)
    setError('')
    setResult(null)
    try {
      const data = await adminEstimateSources([sourceA, sourceB], [usernameA, usernameB])
      setResult(normalizeEstimate(data))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Estimate not available for the selected sources.'))
    } finally {
      setEstimating(false)
    }
  }

  return (
    <OperationShell
      title="Estimate"
      description="[admin] Estimate similarity between two sources"
    >
      <div className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            {[
              {
                title: 'First source',
                username: usernameA,
                setUsername: setUsernameA,
                source: sourceA,
                setSource: setSourceA,
                sources: sourcesA,
              },
              {
                title: 'Second source',
                username: usernameB,
                setUsername: setUsernameB,
                source: sourceB,
                setSource: setSourceB,
                sources: sourcesB,
              },
            ].map((panel) => (
              <div key={panel.title} className="space-y-3">
                <p className="text-sm font-medium text-gray-900">{panel.title}</p>
                <UserCombobox
                  users={users}
                  value={panel.username}
                  onChange={(nextUsername) => {
                    panel.setUsername(nextUsername)
                    setError('')
                  }}
                  disabled={loadingUsers}
                />
                <SourceCombobox
                  sources={panel.sources}
                  value={panel.source}
                  onChange={panel.setSource}
                  accent="amber"
                />
              </div>
            ))}
          </div>

          <LoadingButton
            onClick={handleEstimate}
            loading={estimating}
            loadingLabel="Estimating..."
            disabled={!canEstimate}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Estimate
          </LoadingButton>
        </div>

        {error && (
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        )}

        <EstimateResults result={result} showLoadBy />
      </div>
    </OperationShell>
  )
}
