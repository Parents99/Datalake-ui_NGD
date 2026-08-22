import type { UploadedSource } from '../../api/sources'
import { SelectCombobox } from './SelectCombobox'

interface Props {
  label?: string
  sources: UploadedSource[]
  value: string
  onChange: (filename: string) => void
  accent?: 'blue' | 'amber'
  className?: string
  disabled?: boolean
}

export function UploadedSourceCombobox({
  label = 'Pending file',
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
        value: source.filename,
        label: source.displayName,
        description: source.name !== source.displayName ? source.name : undefined,
        searchText: `${source.displayName} ${source.name}`,
      }))}
      value={value}
      onChange={onChange}
      accent={accent}
      className={className}
      disabled={disabled || sources.length === 0}
      placeholder="Select pending file"
      searchPlaceholder="Search pending file"
      emptyMessage="No pending file found."
    />
  )
}
