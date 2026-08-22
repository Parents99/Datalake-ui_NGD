import { create } from 'zustand'
import { login as apiLogin, logout as apiLogout, signin as apiSignin } from '../api/auth'

interface AuthState {
  username: string | null
  role: 'user' | 'admin' | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  signin: (username: string, password: string, confirmPassword: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => void
}

export const useAuth = create<AuthState>((set) => ({
  username: null,
  role: null,
  isAuthenticated: false,

  hydrate: () => {
    const user = localStorage.getItem('dl_user')
    if (!user) return

    try {
      const value: unknown = JSON.parse(user)
      if (
        !value ||
        typeof value !== 'object' ||
        !('username' in value) ||
        typeof value.username !== 'string' ||
        !('role' in value) ||
        (value.role !== 'user' && value.role !== 'admin')
      ) {
        throw new Error('Invalid stored user')
      }

      set({ username: value.username, role: value.role, isAuthenticated: true })
    } catch {
      localStorage.removeItem('dl_user')
    }
  },

  login: async (username, password) => {
    
    const data = await apiLogin(username, password)

    localStorage.setItem('dl_user', JSON.stringify({ username: data.username ?? username, role: data.role }))
    set({ username: data.username ?? username, role: data.role, isAuthenticated: true })
    
  },

  signin: async (username, password, confirmPassword) => {
    const data = await apiSignin(username, password, confirmPassword)
    localStorage.setItem('dl_user', JSON.stringify({ username: data.username ?? username, role: data.role }))
    set({ username: data.username ?? username, role: data.role, isAuthenticated: true })
  },

  logout: async () => {
    await apiLogout().catch(() => undefined)
    localStorage.removeItem('dl_user')
    set({ username: null, role: null, isAuthenticated: false })

  },

}))
