import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { estimateSources } from '../../api/operations'
import { getSources } from '../../api/sources'
import type { Source } from '../../api/sources'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OperationShell } from '../../components/ui/OperationShell'
import { SourceCombobox } from '../../components/ui/SourceCombobox'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { EstimateResults } from '../../features/estimate/EstimateResults'
import { normalizeEstimate, type EstimateResult } from '../../features/estimate/estimateUtils'

export default function Estimate() {
  const [sources, setSources] = useState<Source[]>([])
  const [sourceA, setSourceA] = useState('')
  const [sourceB, setSourceB] = useState('')
  const [result, setResult] = useState<EstimateResult>(null)
  const [loadingSources, setLoadingSources] = useState(true)
  const [estimating, setEstimating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSources()
      .then((data) => {
        setSources(data)
        setSourceA(data[0]?.name ?? '')
        setSourceB(data[1]?.name ?? '')
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load sources.')))
      .finally(() => setLoadingSources(false))
  }, [])

  const canEstimate = sourceA !== '' && sourceB !== '' && sourceA !== sourceB

  const handleEstimate = async () => {
    if (!canEstimate) return
    setEstimating(true)
    setError('')
    setResult(null)
    try {
      const data = await estimateSources([sourceA, sourceB])
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
      description="Estimate similarity between two sources"
    >
      <div className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <SourceCombobox
                label="First source"
                sources={sources}
                value={sourceA}
                onChange={setSourceA}
                disabled={loadingSources}
              />
            </div>
            <div>
              <SourceCombobox
                label="Second source"
                sources={sources}
                value={sourceB}
                onChange={setSourceB}
                disabled={loadingSources}
              />
            </div>
          </div>

          <LoadingButton
            onClick={handleEstimate}
            loading={estimating}
            loadingLabel="Estimating..."
            disabled={!canEstimate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Estimate
          </LoadingButton>
        </div>

        {error && (
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        )}

        {!loadingSources && sources.length < 2 && (
          <StatusMessage tone="info">At least two sources are required to compute an estimate.</StatusMessage>
        )}

        <EstimateResults result={result} />
      </div>
    </OperationShell>
  )
}
