import { client, toApiMessage, unwrapSdl } from './client'

export interface User {
  id: string
  username: string
  role: 'user' | 'admin'
  createdAt?: string
  created_at?: string
}

const normalizeUsers = (data: unknown): User[] => {
  const value = unwrapSdl(data)
  if (!Array.isArray(value)) return []

  return value.flatMap<User>((item) => {
    if (typeof item === 'string') {
      return [{ id: item, username: item, role: 'user', createdAt: undefined, created_at: undefined }]
    }

    if (item && typeof item === 'object' && 'username' in item) {
      const raw = item as { id?: unknown; username: unknown; role?: unknown; createdAt?: unknown; created_at?: unknown }
      if (typeof raw.username !== 'string') return []
      const createdAt = typeof raw.createdAt === 'string'
        ? raw.createdAt
        : typeof raw.created_at === 'string'
          ? raw.created_at
          : undefined
      return [{
        id: typeof raw.id === 'string' ? raw.id : raw.username,
        username: raw.username,
        role: raw.role === 'admin' ? 'admin' : 'user',
        createdAt,
        created_at: createdAt,
      }]
    }

    return []
  })
}

export const getUsers = () =>
  client.get('/admin/users').then((r) => normalizeUsers(r.data))

export const deleteUser = (username: string) =>
  client.get('/admin/deleteUser', { params: { username } }).then((r) => ({ message: toApiMessage(r.data) }))
