import { useEffect, useMemo, useRef, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { adminQuery } from '../../api/operations'
import { DataTable, DataTableCell, DataTableEmpty, DataTableHeader } from '../../components/ui/DataTable'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OperationShell } from '../../components/ui/OperationShell'
import { StatusMessage } from '../../components/ui/StatusMessage'

const DEFAULT_QUERY = `SELECT ?uri ?user
WHERE{
    ?uri rdf:type dl:Source;
    dl:loadBy ?user.
}`

const QUERY_HISTORY_KEY = 'sdl.admin.query.history'
const QUERY_HISTORY_LIMIT = 10

type QueryHistoryStatus = 'success' | 'error'

interface QueryHistoryEntry {
  id: string
  query: string
  status: QueryHistoryStatus
  executedAt: string
}

const isPrimitive = (value: unknown): value is string | number | boolean | null =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value)

const isResultMatrix = (value: unknown): value is Array<Array<string | number | boolean | null>> =>
  Array.isArray(value) && value.every((row) => Array.isArray(row) && row.every(isPrimitive))

const formatCell = (value: string | number | boolean | null) => {
  if (value === null) return '-'
  return String(value)
}

const isQueryHistoryEntry = (value: unknown): value is QueryHistoryEntry => (
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'query' in value &&
  'status' in value &&
  'executedAt' in value &&
  typeof value.id === 'string' &&
  typeof value.query === 'string' &&
  (value.status === 'success' || value.status === 'error') &&
  typeof value.executedAt === 'string'
)

const createQueryHistoryEntry = (query: string, status: QueryHistoryStatus): QueryHistoryEntry => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  query,
  status,
  executedAt: new Date().toISOString(),
})

const normalizeQueryHistoryItem = (item: unknown): QueryHistoryEntry | null => {
  if (isQueryHistoryEntry(item)) return item
  if (typeof item === 'string') return createQueryHistoryEntry(item, 'success')
  return null
}

const loadQueryHistory = (): QueryHistoryEntry[] => {
  try {
    const rawHistory = window.localStorage.getItem(QUERY_HISTORY_KEY)
    const parsedHistory = rawHistory ? JSON.parse(rawHistory) : []
    if (!Array.isArray(parsedHistory)) return []

    return parsedHistory
      .map(normalizeQueryHistoryItem)
      .filter((item): item is QueryHistoryEntry => item !== null)
      .slice(0, QUERY_HISTORY_LIMIT)
  } catch {
    return []
  }
}

const saveQueryHistory = (history: QueryHistoryEntry[]) => {
  window.localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history.slice(0, QUERY_HISTORY_LIMIT)))
}

const queryPreview = (sparql: unknown) => (
  typeof sparql === 'string' ? sparql.replace(/\s+/g, ' ').trim() : ''
)

const formatHistoryDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ClipboardIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5h6" />
      <path d="M9 4h6v4H9z" />
      <path d="M8 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  )
}

const formatQueryError = (message: string) => {
  if (/something went wrong while processing query/i.test(message)) {
    return 'Error while executing the query.'
  }
  return message
}

const extractSelectColumns = (sparql: string, columnCount: number) => {
  const normalized = sparql.replace(/#[^\n\r]*/g, ' ')
  const match = normalized.match(/\bselect\b([\s\S]*?)\bwhere\b/i)
  const selectBody = match?.[1]?.trim() ?? ''

  if (!selectBody || selectBody.includes('*')) return []

  const aliasColumns = Array.from(selectBody.matchAll(/\bas\s+\?([A-Za-z_][\w-]*)/gi)).map((item) => item[1])
  const withoutParentheses = selectBody.replace(/\([^)]*\)/g, ' ')
  const directColumns = Array.from(withoutParentheses.matchAll(/\?([A-Za-z_][\w-]*)/g)).map((item) => item[1])
  const columns = [...directColumns, ...aliasColumns]

  return columns.length === columnCount ? columns : []
}

export default function AdminQuery() {
  const queryPanelRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [executedQuery, setExecutedQuery] = useState('')
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>(loadQueryHistory)
  const [showHistory, setShowHistory] = useState(false)
  const [historyHeight, setHistoryHeight] = useState<number | null>(null)

  const matrix = useMemo(() => (isResultMatrix(result) ? result : null), [result])
  const columnCount = useMemo(() => matrix?.reduce((max, row) => Math.max(max, row.length), 0) ?? 0, [matrix])
  const selectColumns = useMemo(() => extractSelectColumns(executedQuery, columnCount), [columnCount, executedQuery])
  const queryCellClass = columnCount <= 3
    ? 'min-w-20 max-w-72 break-words'
    : 'min-w-28 max-w-80 break-words'

  useEffect(() => {
    if (!showHistory || !queryPanelRef.current) {
      setHistoryHeight(null)
      return undefined
    }

    const panel = queryPanelRef.current
    const updateHeight = () => setHistoryHeight(panel.getBoundingClientRect().height)

    updateHeight()

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateHeight)
      : null
    observer?.observe(panel)
    window.addEventListener('resize', updateHeight)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [showHistory])

  const addQueryToHistory = (executedSparql: string, status: QueryHistoryStatus) => {
    setQueryHistory((currentHistory) => {
      const nextHistory = [
        createQueryHistoryEntry(executedSparql, status),
        ...currentHistory.filter((historyItem) => historyItem.query !== executedSparql),
      ].slice(0, QUERY_HISTORY_LIMIT)
      saveQueryHistory(nextHistory)
      return nextHistory
    })
  }

  const deleteHistoryEntry = (id: string) => {
    setQueryHistory((currentHistory) => {
      const nextHistory = currentHistory.filter((historyItem) => historyItem.id !== id)
      saveQueryHistory(nextHistory)
      return nextHistory
    })
  }

  const copyHistoryEntry = async (sparql: string) => {
    try {
      await navigator.clipboard.writeText(sparql)
    } catch {
      setError('Unable to copy the query to the clipboard.')
    }
  }

  const handleRun = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    setRunning(true)
    setError('')
    setResult(null)
    setExecutedQuery('')

    try {
      const data = await adminQuery(trimmedQuery)
      setExecutedQuery(trimmedQuery)
      if (typeof data === 'string') {
        addQueryToHistory(trimmedQuery, 'error')
        setError(formatQueryError(data))
      } else {
        addQueryToHistory(trimmedQuery, 'success')
        setResult(data)
      }
    } catch (err) {
      addQueryToHistory(trimmedQuery, 'error')
      setError(formatQueryError(getApiErrorMessage(err, 'Error while executing the query.')))
    } finally {
      setRunning(false)
    }
  }

  return (
    <OperationShell
      title="Query"
    >
      <div className="space-y-5">
        <div className={`grid grid-cols-1 items-start gap-4 ${showHistory ? 'xl:grid-cols-[minmax(0,1fr)_18rem]' : 'xl:max-w-4xl'}`}>
          <div ref={queryPanelRef} className="bg-white border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-900">SPARQL</label>
            </div>

            <textarea
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setError('')
              }}
              rows={8}
              spellCheck={false}
              className="w-full px-3 py-3 text-sm font-mono border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-y"
            />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    //setExecutedQuery('')
                    //setResult(null)
                    //setError('')
                  }}
                  disabled={running || query === ''}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:text-gray-300 disabled:bg-white text-sm font-medium transition-colors"
                >
                  Clean
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory((current) => !current)}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                    showHistory
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  History
                </button>
              </div>
              <LoadingButton
                type="button"
                onClick={handleRun}
                loading={running}
                loadingLabel="Running..."
                disabled={query.trim() === ''}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Run
              </LoadingButton>
            </div>
          </div>

          {showHistory && (
            <div
              className="bg-white border border-gray-100 rounded-lg p-4 flex flex-col"
              style={historyHeight ? { height: historyHeight } : undefined}
            >
              <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <p className="text-sm font-medium text-gray-900">Query history</p>
                <button
                  type="button"
                  onClick={() => {
                    setQueryHistory([])
                    saveQueryHistory([])
                  }}
                  disabled={queryHistory.length === 0}
                  className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                  title="Clear history"
                  aria-label="Clear history"
                >
                  <TrashIcon />
                </button>
              </div>

              {queryHistory.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">No recent query.</p>
              ) : (
                <div className="space-y-2 overflow-auto pr-1">
                  {queryHistory.map((rawHistoryItem, index) => {
                    const historyItem = normalizeQueryHistoryItem(rawHistoryItem)
                    if (!historyItem) return null

                    return (
                    <div
                      key={historyItem.id || index}
                      className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(historyItem.query)
                          setError('')
                        }}
                        className="w-full text-left"
                        title="Load query"
                      >
                        <span className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              historyItem.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{historyItem.status === 'success' ? 'Success' : 'Error'}</span>
                          <span className="ml-auto">{formatHistoryDate(historyItem.executedAt)}</span>
                        </span>
                        <span className="block text-xs font-mono text-gray-600 line-clamp-2 break-words">
                          {queryPreview(historyItem.query)}
                        </span>
                      </button>

                      <div className="mt-2 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void copyHistoryEntry(historyItem.query)}
                          className="h-7 w-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-white flex items-center justify-center transition-colors"
                          title="Copy query"
                          aria-label="Copy query"
                        >
                          <ClipboardIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHistoryEntry(historyItem.id)}
                          className="h-7 w-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                          title="Delete query"
                          aria-label="Delete query"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        )}

        {matrix && (
          <div className={`space-y-3 ${columnCount <= 3 ? 'max-w-4xl' : ''}`}>
            <p className="text-xs text-gray-400">
              {matrix.length === 1 ? '1 row returned' : `${matrix.length} rows returned`}
            </p>
            <DataTable className="min-w-max">
                <thead>
                  <tr className="border-b border-gray-100">
                    {Array.from({ length: columnCount }, (_, index) => (
                      <DataTableHeader key={index} className="sticky top-0 z-10 whitespace-nowrap">
                        {selectColumns[index] ?? `Colonna ${index + 1}`}
                      </DataTableHeader>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`${rowIndex < matrix.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/70 transition-colors`}
                    >
                      {Array.from({ length: columnCount }, (_, columnIndex) => (
                        <DataTableCell key={columnIndex} className={queryCellClass}>
                          {formatCell(row[columnIndex] ?? null)}
                        </DataTableCell>
                      ))}
                    </tr>
                  ))}
                  {matrix.length === 0 && (
                    <DataTableEmpty colSpan={Math.max(columnCount, 1)}>
                      No result returned.
                    </DataTableEmpty>
                  )}
                </tbody>
            </DataTable>
          </div>
        )}

        {result !== null && !matrix && !error && (
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Response</p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </OperationShell>
  )
}
