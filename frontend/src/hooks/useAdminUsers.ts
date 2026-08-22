import { useEffect, useMemo, useState } from 'react'
import { getUsers, type User } from '../api/admin'

const userFromUsername = (username: string, role: User['role'] = username === 'admin' ? 'admin' : 'user'): User => ({
  id: username,
  username,
  role,
})

export function useAdminUsers(currentUsername = 'admin') {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getUsers()
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setUsers([])
          setError(err instanceof Error ? err.message : 'Unable to load users.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const options = useMemo(() => {
    const byUsername = new Map<string, User>()
    byUsername.set('admin', userFromUsername('admin', 'admin'))
    if (currentUsername) {
      byUsername.set(currentUsername, userFromUsername(currentUsername))
    }
    users.forEach((user) => byUsername.set(user.username, user))
    return Array.from(byUsername.values()).sort((left, right) => {
      if (left.username === 'admin') return -1
      if (right.username === 'admin') return 1
      return left.username.localeCompare(right.username)
    })
  }, [currentUsername, users])

  return { users: options, loading, error }
}
