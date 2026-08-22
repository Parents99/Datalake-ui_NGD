import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import { describeSource } from '../../api/operations'
import { getSources } from '../../api/sources'
import type { Source } from '../../api/sources'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OperationShell } from '../../components/ui/OperationShell'
import { SourceCombobox } from '../../components/ui/SourceCombobox'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { DescribeResults } from '../../features/describe/DescribeResults'
import {
  findInitialSource,
  normalizeDescribe,
  type DescribeResult,
} from '../../features/describe/describeUtils'

export default function Describe() {
  const [searchParams] = useSearchParams()
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState('')
  const [loadedSource, setLoadedSource] = useState('')
  const [result, setResult] = useState<DescribeResult | null>(null)
  const [loadingSources, setLoadingSources] = useState(true)
  const [loadingDescribe, setLoadingDescribe] = useState(false)
  const [error, setError] = useState('')
  const autoRunRef = useRef('')
  const autoRunConsumedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoadingSources(true)
    getSources()
      .then((data) => {
        if (cancelled) return
        setSources(data)
        setSelectedSource(findInitialSource(data, searchParams.get('id')))
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Unable to load sources.'))
      })
      .finally(() => {
        if (!cancelled) setLoadingSources(false)
      })

    return () => {
      cancelled = true
    }
  }, [searchParams])

  const handleLoadDescribe = async () => {
    if (!selectedSource) return

    const sourceIdentifier =
      sources.find((source) => source.name === selectedSource || source.id === selectedSource)?.id ?? selectedSource

    setLoadingDescribe(true)
    setError('')
    setResult(null)

    try {
      const data = await describeSource(sourceIdentifier)
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
    if (autoRunRef.current === selectedSource) return

    autoRunConsumedRef.current = true
    autoRunRef.current = selectedSource
    void handleLoadDescribe()
  }, [loadingDescribe, loadingSources, searchParams, selectedSource])

  return (
    <OperationShell
      title="Describe"
      description="Source metadata and mapping to the Knowledge Graph"
    >
      <div className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-lg p-4 w-full md:w-fit">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <SourceCombobox
              sources={sources}
              value={selectedSource}
              onChange={(nextSource) => {
                setSelectedSource(nextSource)
                setError('')
              }}
              disabled={loadingSources}
              className="w-full md:w-[42rem]"
            />
            <LoadingButton
              type="button"
              onClick={handleLoadDescribe}
              loading={loadingDescribe}
              loadingLabel="Describe..."
              disabled={!selectedSource}
              className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Describe
            </LoadingButton>
          </div>
        </div>

        {error && (
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        )}

        <DescribeResults
          result={result}
          loading={loadingDescribe}
          loadedLabel={`Describe loaded: ${loadedSource || selectedSource}`}
          emptyMessage="Select a source and press Describe to view metadata."
        />
      </div>
    </OperationShell>
  )
}
