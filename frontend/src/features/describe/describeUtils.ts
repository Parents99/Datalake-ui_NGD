import type { Source } from '../../api/sources'

export type DescribeDomain =
  | {
      domain: string
      mapTo: string
      completeness: string
      type?: never
    }
  | {
      domain: string
      type: string
      mapTo?: never
      completeness?: never
    }

export interface DescribeResult {
  name?: string
  source?: string
  loadBy?: string
  loadingDate?: string
  numItems?: number
  numDomains?: number
  numMappedDomains?: number
  description?: DescribeDomain[]
  rows?: number
  columns?: Array<{ name: string; type?: string; nullable?: boolean }>
  format?: string
  mounted_by?: string
  mounted_at?: string
}

export const shortName = (value?: string | number) => {
  if (value === undefined || value === null) return '-'
  const text = String(value)
  return text.split('/').filter(Boolean).pop() ?? text
}

const asNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return undefined
}

export const normalizeDescribe = (data: unknown): DescribeResult => {
  const value = data as DescribeResult

  if (value.columns && !value.description) {
    return {
      name: value.source ?? value.name,
      loadBy: value.mounted_by,
      loadingDate: value.mounted_at,
      numItems: value.rows,
      numDomains: value.columns.length,
      numMappedDomains: 0,
      format: value.format,
      description: value.columns.map((column) => ({
        domain: column.name,
        type: column.type ?? 'unknown',
      })),
    }
  }

  return {
    ...value,
    numItems: asNumber(value.numItems),
    numDomains: asNumber(value.numDomains),
    numMappedDomains: asNumber(value.numMappedDomains),
    description: value.description ?? [],
  }
}

export const findInitialSource = (sources: Source[], id: string | null) => {
  if (!id) return sources[0]?.name ?? ''
  return sources.find((source) => source.id === id || source.name === id)?.name ?? id
}

export const describeStats = (result: DescribeResult) => {
  const domains = result.description ?? []
  const mappedDomains = domains.filter((domain) => 'mapTo' in domain).length

  return {
    domains,
    mappedDomains,
  }
}
