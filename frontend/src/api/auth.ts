import { client, toApiMessage, unwrapSdl } from './client'

export interface AuthResponse {
  role: 'user' | 'admin'
  username: string
}

export const login = (username: string, password: string) => {
  const fd = new FormData()
  fd.append('username', username)
  fd.append('password', password)

  return client.post('/login', fd).then((r) => {
    const message = toApiMessage(r.data)
    if (/wrong credentials/i.test(message)) {
      throw new Error('Credenziali non valide')
    }

    const matchedUsername = message.match(/Logged \((.+)\)/)?.[1] ?? username
    return {
      username: matchedUsername,
      role: matchedUsername === 'admin' ? 'admin' : 'user',
    } satisfies AuthResponse
  })
}

export const signin = (username: string, password: string, confirmPassword: string) => {
  const fd = new FormData()
  fd.append('username', username)
  fd.append('password', password)
  fd.append('confirmPassword', confirmPassword)

  return client.post('/signin', fd).then((r) => {
    const message = toApiMessage(r.data)
    const matchedUsername = message.match(/Sign up done, logged:\s*(.+)/i)?.[1]?.trim()

    if (!matchedUsername) {
      throw new Error(message)
    }

    return {
      username: matchedUsername || username,
      role: 'user',
    } satisfies AuthResponse
  })
}

export const logout = () =>
  client.get('/logout').then((r) => unwrapSdl(r.data))
