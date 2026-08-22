import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import { adminDescribeSource, adminProfileSource } from '../../api/operations'
import { adminGetSources } from '../../api/sources'
import type { Source } from '../../api/sources'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OperationShell } from '../../components/ui/OperationShell'
import { SelectCombobox, type ComboboxOption } from '../../components/ui/SelectCombobox'
import { SourceCombobox } from '../../components/ui/SourceCombobox'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { UserCombobox } from '../../components/ui/UserCombobox'
import { ProfileResults } from '../../features/profile/ProfileResults'
import {
  domainOptionsFromDescribe as sharedDomainOptionsFromDescribe,
  findInitialSource as sharedFindInitialSource,
  normalizeProfileResponse as sharedNormalizeProfileResponse,
  type FullProfileEntry,
} from '../../features/profile/profileUtils'
import { useAuth } from '../../hooks/useAuth'
import { useAdminUsers } from '../../hooks/useAdminUsers'

export default function AdminProfile() {
  const [searchParams] = useSearchParams()
  const { username } = useAuth()
  const [sources, setSources] = useState<Source[]>([])
  const [selectedUsername, setSelectedUsername] = useState(searchParams.get('username') ?? username ?? 'admin')
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
  const { users, loading: loadingUsers } = useAdminUsers(username ?? 'admin')

  useEffect(() => {
    let cancelled = false
    setLoadingSources(true)
    setProfile([])
    setLoadedSource('')
    setSelectedDomain('')
    setDomainOptions([{ key: 'all-domains', value: '', label: 'All domains' }])
    setError('')

    adminGetSources(selectedUsername)
      .then((data) => {
        if (cancelled) return
        setSources(data)
        setSelectedSource(sharedFindInitialSource(data, searchParams.get('id')))
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

    adminDescribeSource(selectedSource, selectedUsername)
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
  }, [selectedSource, selectedUsername])

  const handleLoadProfile = async () => {
    if (!selectedSource) return

    setLoadingProfile(true)
    setError('')
    setProfile([])

    try {
      const data = await adminProfileSource(selectedSource, selectedDomain || undefined, rollUp, selectedUsername)
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

    const autoRunKey = `${selectedUsername}:${selectedSource}`
    if (autoRunRef.current === autoRunKey) return

    autoRunConsumedRef.current = true
    autoRunRef.current = autoRunKey
    void handleLoadProfile()
  }, [loadingProfile, loadingSources, searchParams, selectedSource, selectedUsername])

  return (
    <OperationShell title="Profile" description="[admin] Dynamic profiles for source domains">
      <div className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-lg p-4 w-full lg:w-fit">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
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
              onClick={handleLoadProfile}
              loading={loadingProfile}
              loadingLabel="Profile..."
              disabled={!selectedSource}
              className="w-full lg:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
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
              accent="amber"
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
                className={`relative h-5 w-9 rounded-full transition-colors ${rollUp ? 'bg-amber-500' : 'bg-gray-200'}`}
                aria-pressed={rollUp}
              >
                <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${rollUp ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              RollUp
            </label>
          </div>
        </div>

        {error && (
          <StatusMessage tone="error">{error}</StatusMessage>
        )}

        <ProfileResults
          profile={profile}
          topN={topN}
          onTopNChange={setTopN}
          loading={loadingProfile}
          loadedLabel={`Profile loaded: ${loadedSource || selectedSource} - user ${selectedUsername}`}
          emptyMessage="Select a user and source, then press Profile to view profiles."
          accent="amber"
        />
      </div>
    </OperationShell>
  )
}
