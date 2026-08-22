import axios from 'axios'

export interface SdlEnvelope<T> {
  SDL: T
}

export const unwrapSdl = <T>(data: T | SdlEnvelope<T>): T => {
  if (data && typeof data === 'object' && 'SDL' in data) {
    return (data as SdlEnvelope<T>).SDL
  }
  return data as T
}

export const toApiMessage = (data: unknown): string => {
  const value = unwrapSdl(data)
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'message' in value) {
    return String((value as { message: unknown }).message)
  }
  return 'Operation completed.'
}

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed.'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (data !== undefined) return toApiMessage(data)
    if (error.message) return error.message
  }

  if (error instanceof Error && error.message) return error.message

  return fallback
}

export const client = axios.create({
  baseURL: '/api',
  paramsSerializer: {
    indexes: null,
  },
})

const isAuthenticationRequired = (data: unknown): boolean => {
  if (!data || typeof data !== 'object' || !('SDL' in data)) return false

  return String((data as { SDL: unknown }).SDL).trim().toLowerCase() === 'please login first'
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const authenticationRequired =
      err.response?.status === 401 || isAuthenticationRequired(err.response?.data)

    if (authenticationRequired) {
      localStorage.removeItem('dl_user')
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    return Promise.reject(err)
  }
)
