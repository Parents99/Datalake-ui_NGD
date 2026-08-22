import { useEffect, useMemo, useRef, useState } from 'react'

export interface ComboboxOption {
  key: string
  value: string
  label: string
  description?: string
  searchText?: string
}

interface Props {
  label: string
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  accent?: 'blue' | 'amber'
  className?: string
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  size?: 'sm' | 'md'
}

export function SelectCombobox({
  label,
  options,
  value,
  onChange,
  accent = 'blue',
  className = '',
  disabled = false,
  placeholder = 'Select',
  searchPlaceholder = 'Search',
  emptyMessage = 'No results found.',
  size = 'md',
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedOption = options.find((option) => option.value === value)
  const ringClass = accent === 'amber'
    ? 'focus:ring-amber-500/20 focus:border-amber-400'
    : 'focus:ring-blue-500/20 focus:border-blue-400'
  const buttonSizeClass = size === 'sm' ? 'px-2 py-1.5' : 'px-3 py-2'

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options

    return options.filter((option) =>
      (option.searchText ?? `${option.label} ${option.description ?? ''}`)
        .toLowerCase()
        .includes(normalized),
    )
  }, [options, query])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (disabled) {
      setOpen(false)
      setQuery('')
    }
  }, [disabled])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      )}

      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`w-full ${buttonSizeClass} text-sm border border-gray-200 rounded-lg bg-white text-left focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${ringClass}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="block truncate">
            <span title={selectedOption ? `${selectedOption.label}${selectedOption.description ? ` - ${selectedOption.description}` : ''}` : value || placeholder}>
              {selectedOption?.label ?? (value || placeholder)}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 border-r border-b border-gray-400 transition-transform ${
              open ? 'rotate-[225deg] translate-y-0.5' : 'rotate-45 -translate-y-0.5'
            }`}
          />
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${ringClass}`}
            />
          </div>

          <div className="max-h-56 overflow-auto py-1">
            {filteredOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                  setQuery('')
                }}
                title={`${option.label}${option.description ? ` - ${option.description}` : ''}`}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  option.value === value ? 'font-medium text-gray-900 bg-gray-50' : 'text-gray-600'
                }`}
              >
                <span className="block truncate">{option.label}</span>
                {option.description && (
                  <span className="block text-xs text-gray-400 truncate">{option.description}</span>
                )}
              </button>
            ))}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-400">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
