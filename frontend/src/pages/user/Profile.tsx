import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import { describeSource, profileSource } from '../../api/operations'
import { getSources } from '../../api/sources'
import type { Source } from '../../api/sources'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OperationShell } from '../../components/ui/OperationShell'
import { SelectCombobox, type ComboboxOption } from '../../components/ui/SelectCombobox'
import { SourceCombobox } from '../../components/ui/SourceCombobox'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { ProfileResults } from '../../features/profile/ProfileResults'
import {
  domainOptionsFromDescribe as sharedDomainOptionsFromDescribe,
  findInitialSource as sharedFindInitialSource,
  normalizeProfileResponse as sharedNormalizeProfileResponse,
  type FullProfileEntry,
} from '../../features/profile/profileUtils'

export default function Profile() {
  const [searchParams] = useSearchParams()
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState('')
  const [loadedSource, setLoadedSource] = useState('')
  const [profile, setProfile] = useState<FullProfileEntry[]>([])
  const [topN, setTopN] = useState(10)
  const [rollUp, setRollUp] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState('')
  const [domainOptions, setDomainOptions] = useState<ComboboxOption[]>([{ key: 'all-domains', value: '', label: 'All domains' }])
  const [loadingSources, setLoadingSources] = useState(true)
  const [loadingDomains, setLoadingDomains] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
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
        setSelectedSource(sharedFindInitialSource(data, searchParams.get('id')))
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

  useEffect(() => {
    if (!selectedSource) {
      setSelectedDomain('')
      setDomainOptions([{ key: 'all-domains', value: '', label: 'All domains' }])
      return
    }

    let cancelled = false
    setLoadingDomains(true)
    setSelectedDomain('')
    setDomainOptions([{ key: 'all-domains', value: '', label: 'All domains' }])

    describeSource(selectedSource)
      .then((data) => {
        if (!cancelled) setDomainOptions(sharedDomainOptionsFromDescribe(data))
      })
      .catch(() => {
        if (!cancelled) setDomainOptions([{ key: 'all-domains', value: '', label: 'All domains' }])
      })
      .finally(() => {
        if (!cancelled) setLoadingDomains(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedSource])

  const handleLoadProfile = async () => {
    if (!selectedSource) return

    setLoadingProfile(true)
    setError('')
    setProfile([])

    try {
      const data = await profileSource(selectedSource, selectedDomain || undefined, rollUp)
      const normalizedProfile = sharedNormalizeProfileResponse(data, selectedDomain)
      if (normalizedProfile) {
        setProfile(normalizedProfile)
        setLoadedSource(selectedSource)
      } else {
        setLoadedSource('')
        setError('Profile response format not recognized.')
      }
    } catch (err) {
      setLoadedSource('')
      setError(getApiErrorMessage(err, 'Profile not available for this source.'))
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('run') !== '1' || loadingSources || loadingProfile || !selectedSource) return
    if (autoRunConsumedRef.current) return
    if (autoRunRef.current === selectedSource) return

    autoRunConsumedRef.current = true
    autoRunRef.current = selectedSource
    void handleLoadProfile()
  }, [loadingProfile, loadingSources, searchParams, selectedSource])

  return (
    <OperationShell
      title="Profile"
      description="View profiles for the whole source or a domain"
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
              onClick={handleLoadProfile}
              loading={loadingProfile}
              loadingLabel="Profile..."
              disabled={!selectedSource}
              className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Profile
            </LoadingButton>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-4">
            <SelectCombobox
              label=""
              options={domainOptions}
              value={selectedDomain}
              onChange={(nextDomain) => {
                setSelectedDomain(nextDomain)
                setError('')
              }}
              disabled={loadingDomains}
              className="w-56"
              placeholder="All domains"
              searchPlaceholder="Search domain"
              emptyMessage="No domain found."
              size="sm"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <button
                type="button"
                onClick={() => {
                  setRollUp((current) => !current)
                  setError('')
                }}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  rollUp ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                aria-pressed={rollUp}
              >
                <span
                  className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    rollUp ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
              RollUp
            </label>
          </div>
        </div>

        {error && (
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        )}

        <ProfileResults
          profile={profile}
          topN={topN}
          onTopNChange={setTopN}
          loading={loadingProfile}
          loadedLabel={`Profile loaded: ${loadedSource || selectedSource}`}
          emptyMessage="Select a source and press Profile to view profiles."
          accent="blue"
        />
      </div>
    </OperationShell>
  )
}
