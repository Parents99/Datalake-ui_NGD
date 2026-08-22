export interface EstimateComparison {
  source: string
  domain: string
  loadBy: string
}

export interface EstimateRow {
  level: string
  similarity: number
  comparison: EstimateComparison[]
}

export type EstimateResult = EstimateRow[] | string | null

export const shortName = (value: string) => value.split('/').filter(Boolean).pop() ?? value

export const normalizeEstimate = (data: unknown): EstimateRow[] | string => {
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data as EstimateRow[]

  const value = data as {
    sources?: string[]
    confidence?: number
    common_attributes?: string[]
  }

  if (value.common_attributes) {
    return value.common_attributes.map((attribute) => ({
      level: attribute,
      similarity: Math.round((value.confidence ?? 0) * 1000) / 10,
      comparison: (value.sources ?? []).map((source) => ({
        source,
        domain: attribute,
        loadBy: '',
      })),
    }))
  }

  return []
}
