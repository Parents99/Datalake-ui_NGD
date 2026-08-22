import type { ComboboxOption } from '../../components/ui/SelectCombobox'
import type { Source } from '../../api/sources'

export const TOP_N_OPTIONS = [10, 25, 50]
export const ARRAY_KEYS = ['categories', 'histogram', 'frequentWords', 'years']

export type Primitive = string | number | boolean | null

export interface FrequencyItem {
  item: Primitive
  occurrences: number
}

export type ProfilePayload = Record<string, unknown> | FrequencyItem[] | null

export interface FullProfileEntry {
  domain: string
  profile: ProfilePayload
  rollUp?: FrequencyItem[]
}

interface DescribeDomain {
  domain?: unknown
  mapTo?: unknown
  type?: unknown
}

export type ProfileKind = 'categorical' | 'numeric' | 'integer' | 'text' | 'date' | 'generic'
export type ProfileKindFilter = 'all' | 'numeric' | 'categorical' | 'text' | 'date' | 'generic'

export const KIND_FILTERS: Array<{ id: ProfileKindFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'numeric', label: 'Numeric' },
  { id: 'categorical', label: 'Categorical' },
  { id: 'text', label: 'Text' },
  { id: 'date', label: 'Date' },
  { id: 'generic', label: 'Other' },
]

export const shortName = (value?: Primitive | undefined) => {
  if (value === undefined || value === null) return '-'
  const text = String(value)
  return text.split('/').filter(Boolean).pop() ?? text
}

export const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 3 })
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export const profileFieldLabel = (key: string) => {
  if (key === 'null') return 'Missing values'
  return key
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isFrequencyItem = (value: unknown): value is FrequencyItem =>
  isRecord(value) && 'item' in value && typeof value.occurrences === 'number'

export const isFrequencyList = (value: unknown): value is FrequencyItem[] =>
  Array.isArray(value) && value.every(isFrequencyItem)

const toFrequencyItem = (value: unknown): FrequencyItem | null => {
  if (!isRecord(value) || !('item' in value)) return null

  const occurrences = value.occurrences
  if (typeof occurrences === 'number') {
    return { item: value.item as Primitive, occurrences }
  }
  if (typeof occurrences === 'string' && occurrences.trim() !== '' && Number.isFinite(Number(occurrences))) {
    return { item: value.item as Primitive, occurrences: Number(occurrences) }
  }

  return null
}

const normalizeFrequencyList = (value: unknown): FrequencyItem[] | null => {
  if (!Array.isArray(value)) return null
  const items = value.map(toFrequencyItem)
  if (items.some((item) => item === null)) return null
  return items as FrequencyItem[]
}

const isProfilePayload = (value: unknown): value is ProfilePayload =>
  value === null || isRecord(value) || isFrequencyList(value)

const isOptionalFrequencyList = (value: unknown): value is FrequencyItem[] | undefined =>
  value === undefined || isFrequencyList(value)

export const isFullProfile = (data: unknown): data is FullProfileEntry[] =>
  Array.isArray(data) && data.every((entry) =>
    isRecord(entry) &&
    typeof entry.domain === 'string' &&
    isProfilePayload(entry.profile) &&
    isOptionalFrequencyList(entry.rollUp),
  )

export const normalizeProfileResponse = (data: unknown, selectedDomain: string): FullProfileEntry[] | null => {
  if (Array.isArray(data)) {
    const rollUpCarrier = data.find((item) => isRecord(item) && ('rollUp' in item || 'rollup' in item))
    if (rollUpCarrier) {
      const profileItems = data.filter((item) => !(isRecord(item) && ('rollUp' in item || 'rollup' in item)))
      const profile = normalizeFrequencyList(profileItems)
      const rawRollUp = isRecord(rollUpCarrier) ? rollUpCarrier.rollUp ?? rollUpCarrier.rollup : undefined
      const rollUp = rawRollUp === undefined || rawRollUp === null ? undefined : normalizeFrequencyList(rawRollUp)

      if (profile && (rawRollUp === undefined || rawRollUp === null || rollUp)) {
        return [{
          domain: selectedDomain || 'profile',
          profile,
          ...(rollUp && rollUp.length > 0 ? { rollUp } : {}),
        }]
      }
    }
  }

  const directFrequencyList = normalizeFrequencyList(data)
  if (directFrequencyList) return [{ domain: selectedDomain || 'profile', profile: directFrequencyList }]

  if (isRecord(data) && 'profile' in data) {
    const rawProfile = data.profile
    const normalizedProfileList = normalizeFrequencyList(rawProfile)
    const profile = normalizedProfileList ?? (isRecord(rawProfile) || rawProfile === null ? rawProfile : null)
    if (profile === null && rawProfile !== null) return null

    const rawRollUp = data.rollUp ?? data.rollup
    const rollUp = rawRollUp === undefined || rawRollUp === null ? undefined : normalizeFrequencyList(rawRollUp)
    if (rawRollUp !== undefined && rawRollUp !== null && !rollUp) return null

    return [{
      domain: typeof data.domain === 'string' ? data.domain : selectedDomain || 'profile',
      profile,
      ...(rollUp ? { rollUp } : {}),
    }]
  }

  if (Array.isArray(data)) {
    const entries = data.map((entry) => {
      if (!isRecord(entry) || typeof entry.domain !== 'string') return null

      const rawProfile = entry.profile
      const normalizedProfileList = normalizeFrequencyList(rawProfile)
      const profile = normalizedProfileList ?? (isRecord(rawProfile) || rawProfile === null ? rawProfile : null)
      if (profile === null && rawProfile !== null) return null

      const rawRollUp = entry.rollUp ?? entry.rollup
      const rollUp = rawRollUp === undefined || rawRollUp === null ? undefined : normalizeFrequencyList(rawRollUp)
      if (rawRollUp !== undefined && rawRollUp !== null && !rollUp) return null

      return {
        domain: entry.domain,
        profile,
        ...(rollUp ? { rollUp } : {}),
      } satisfies FullProfileEntry
    })

    if (entries.every((entry) => entry !== null)) return entries as FullProfileEntry[]
  }

  return null
}

export const inferKind = (domain: string, profile: Record<string, unknown>): ProfileKind => {
  const label = shortName(domain).toLowerCase()
  if (Array.isArray(profile.categories)) return 'categorical'
  if (Array.isArray(profile.frequentWords)) return 'text'
  if (Array.isArray(profile.histogram)) return 'integer'
  if ('years' in profile) return 'date'
  if (['min', 'max', 'mean', 'median', 'sum'].some((key) => key in profile)) return 'numeric'
  if (label.includes('_date_')) return 'date'
  if (label.includes('_str_')) return 'text'
  return 'generic'
}

export const kindLabel = (kind: ProfileKind) => ({
  categorical: 'Categorical',
  numeric: 'Numeric',
  integer: 'Integer',
  text: 'Text',
  date: 'Date',
  generic: 'Generic',
}[kind])

export const matchesKindFilter = (kind: ProfileKind, filter: ProfileKindFilter) => {
  if (filter === 'all') return true
  if (filter === 'numeric') return kind === 'numeric' || kind === 'integer'
  return kind === filter
}

export const scalarEntries = (profile: Record<string, unknown>) =>
  Object.entries(profile).filter(([, value]) => !Array.isArray(value) && !isRecord(value))

export const seriesEntries = (profile: Record<string, unknown>) =>
  ARRAY_KEYS.flatMap((key) => {
    const value = profile[key]
    const items = normalizeFrequencyList(value)
    if (!items) return []
    return [{
      key,
      items,
      total: items.length,
    }]
  })

export const frequencySeries = (key: string, items: FrequencyItem[]) => ({
  key,
  items,
  total: items.length,
})

export const domainOptionsFromDescribe = (data: unknown): ComboboxOption[] => {
  const description = isRecord(data) && Array.isArray(data.description) ? data.description : []
  const grouped = description.reduce<Map<string, { count: number; examples: string[] }>>((acc, rawDomain) => {
    if (!isRecord(rawDomain)) return acc

    const domain = rawDomain as DescribeDomain
    if (typeof domain.mapTo !== 'string') return acc

    const value = shortName(domain.mapTo)
    if (!value || value === '-') return acc

    const current = acc.get(value) ?? { count: 0, examples: [] }
    current.count += 1
    if (typeof domain.domain === 'string' && current.examples.length < 2) {
      current.examples.push(shortName(domain.domain))
    }
    acc.set(value, current)
    return acc
  }, new Map<string, { count: number; examples: string[] }>())

  return [
    { key: 'all-domains', value: '', label: 'All domains' },
    ...Array.from(grouped.entries())
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([value, info]) => ({
        key: value,
        value,
        label: value,
        description: info.examples.join(', ') || undefined,
        searchText: `${value} ${info.examples.join(' ')}`,
      })),
  ]
}

export const findInitialSource = (sources: Source[], id: string | null) => {
  if (!id) return sources[0]?.name ?? ''
  return sources.find((source) => source.id === id || source.name === id)?.name ?? id
}
