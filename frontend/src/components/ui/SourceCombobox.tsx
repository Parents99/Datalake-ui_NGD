import type { Source } from '../../api/sources'
import { SelectCombobox } from './SelectCombobox'

interface Props {
  label?: string
  sources: Source[]
  value: string
  onChange: (sourceName: string) => void
  accent?: 'blue' | 'amber'
  className?: string
  disabled?: boolean
}

export function SourceCombobox({
  label = 'Source',
  sources,
  value,
  onChange,
  accent = 'blue',
  className = '',
  disabled = false,
}: Props) {
  return (
    <SelectCombobox
      label={label}
      options={sources.map((source) => ({
        key: source.id,
        value: source.name,
        label: source.displayName ?? source.name,
        description: source.uri,
        searchText: `${source.displayName ?? ''} ${source.name} ${source.uri ?? ''} ${source.path ?? ''}`,
      }))}
      value={value}
      onChange={onChange}
      accent={accent}
      className={className}
      disabled={disabled || sources.length === 0}
      placeholder="Select source"
      searchPlaceholder="Search source"
      emptyMessage="No source found."
    />
  )
}
