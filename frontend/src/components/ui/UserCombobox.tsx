import type { User } from '../../api/admin'
import { SelectCombobox } from './SelectCombobox'

interface Props {
  label?: string
  users: User[]
  value: string
  onChange: (username: string) => void
  accent?: 'blue' | 'amber'
  className?: string
  disabled?: boolean
}

export function UserCombobox({
  label = 'User',
  users,
  value,
  onChange,
  accent = 'amber',
  className = '',
  disabled = false,
}: Props) {
  return (
    <SelectCombobox
      label={label}
      options={users.map((user) => ({
        key: user.id,
        value: user.username,
        label: user.username,
        description: user.role,
        searchText: `${user.username} ${user.role}`,
      }))}
      value={value}
      onChange={onChange}
      accent={accent}
      className={className}
      disabled={disabled}
      placeholder="Select user"
      searchPlaceholder="Search user"
      emptyMessage="No user found."
    />
  )
}
