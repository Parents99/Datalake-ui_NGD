import { client, toApiMessage, unwrapSdl } from './client'

export interface Source {
  id: string
  name: string
  displayName?: string
  uri?: string
  path?: string
  format?: string
  rows: number
  attributes: number
  status: 'mounted' | 'profiled' | 'new'
  year?: string
  owner?: string
}

export interface UploadedSource {
  id: string
  name: string
  displayName: string
  filename: string
}

interface BackendSource {
  name: string
  location: string
  loadBy: string
}

interface MountOptions {
  stringProcessing?: boolean
  maxCategories?: number
  dateThreshold?: number
  dateTreshold?: number
  frequentWords?: number
}

type MountSourceInput = File | { path: string; name: string }

const sourceIdFromName = (name: string) => {
  const lastSegment = name.split('/').filter(Boolean).pop() ?? name
  return lastSegment.replace(/\.[^.]+$/, '')
}

const displayNameFromPath = (name: string) =>
  name.split(/[\\/]/).filter(Boolean).pop() ?? name

const formatFromPath = (path?: string) => {
  const extension = path?.split('.').pop()
  return extension ? extension.toUpperCase() : 'CSV'
}

const normalizeSource = (source: Source | BackendSource): Source => {
  if ('location' in source) {
    const id = sourceIdFromName(String(source.name))
    return {
      id,
      name: id,
      displayName: id,
      uri: source.name,
      path: source.location,
      format: formatFromPath(source.location),
      rows: 0,
      attributes: 0,
      status: 'mounted',
      owner: source.loadBy,
    }
  }

  return {
    ...source,
    id: source.id ?? sourceIdFromName(source.name),
    displayName: source.displayName ?? sourceIdFromName(source.name),
    rows: source.rows ?? 0,
    attributes: source.attributes ?? 0,
    status: source.status ?? 'mounted',
  }
}

const normalizeSources = (data: unknown): Source[] => {
  const value = unwrapSdl(data)
  if (typeof value === 'string') return []
  if (!Array.isArray(value)) return []
  return value.map((source) => normalizeSource(source as Source | BackendSource))
}

const appendMountOptions = (fd: FormData, opts: MountOptions) => {
  fd.append('stringProcessing', String(opts.stringProcessing ?? true))
  fd.append('maxCategories', String(opts.maxCategories ?? 4))
  fd.append('dateThreshold', String(opts.dateThreshold ?? 0.3))
  fd.append('frequentWords', String(opts.frequentWords ?? 10))
}

const normalizeUploads = (data: unknown): UploadedSource[] => {
  const value = unwrapSdl(data)
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (typeof item !== 'string') return []
    const displayName = displayNameFromPath(item)
    return [{
      id: sourceIdFromName(displayName || item),
      name: item,
      displayName,
      filename: displayName,
    }]
  })
}

// GET /sources
export const getSources = () =>
  client.get('/sources').then((r) => normalizeSources(r.data))

// GET /uploads
export const getUploads = () =>
  client.get('/uploads').then((r) => normalizeUploads(r.data))

// POST /upload (multipart: source=file)
export const uploadSource = (file: File) => {
  const fd = new FormData()
  fd.append('source', file)
  return client.post('/upload', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// DELETE /uploads/<filename>
export const deleteUploadedSource = (filename: string) =>
  client.delete(`/uploads/${encodeURIComponent(filename)}`).then((r) => ({ message: toApiMessage(r.data) }))

// POST /mount (multipart: source=file, stringProcessing, maxCategories, dateThreshold, frequentWords)
export const mountSource = (file: File, opts: MountOptions = {}) => {
  const fd = new FormData()
  fd.append('source', file)
  appendMountOptions(fd, opts)
  return client.post('/mount', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// POST /mount with uploaded=true
export const mountUploadedSource = (filename: string, opts: MountOptions = {}) => {
  const fd = new FormData()
  fd.append('source', filename)
  fd.append('uploaded', 'true')
  appendMountOptions(fd, opts)
  return client.post('/mount', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// POST /mount with remount=true
export const remountSource = (sourceName: string, opts: MountOptions = {}) => {
  const fd = new FormData()
  fd.append('source', sourceName)
  fd.append('remount', 'true')
  appendMountOptions(fd, opts)
  return client.post('/mount', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// POST /unmount (formdata: source=name)
export const unmountSource = (sourceName: string) => {
  const fd = new FormData()
  fd.append('source', sourceName)
  return client.post('/unmount', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// --- Admin variants ---

// GET /admin/sources?username=<username>
export const adminGetSources = (username?: string) =>
  client.get('/admin/sources', { params: username ? { username } : {} }).then((r) => {
    const value = unwrapSdl(r.data)
    if (typeof value === 'string') throw new Error(value)
    if (!Array.isArray(value)) return []
    return value.map((source) => normalizeSource(source as Source | BackendSource))
  })

// GET /admin/uploads?username=<username>
export const adminGetUploads = (username?: string) =>
  client.get('/admin/uploads', { params: username ? { username } : {} }).then((r) => normalizeUploads(r.data))

// POST /admin/upload (multipart: source=file, username)
export const adminUploadSource = (file: File, username = 'admin') => {
  const fd = new FormData()
  fd.append('source', file)
  fd.append('username', username)
  return client.post('/admin/upload', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// DELETE /admin/uploads/<filename>?username=<username>
export const adminDeleteUploadedSource = (filename: string, username = 'admin') =>
  client.delete(`/admin/uploads/${encodeURIComponent(filename)}`, { params: { username } }).then((r) => ({ message: toApiMessage(r.data) }))

// POST /admin/mount (adds username when provided)
export const adminMountSource = (
  source: MountSourceInput,
  username = 'admin',
  opts: MountOptions = {},
) => {
  const fd = new FormData()
  fd.append('source', source instanceof File ? source : source.name)
  fd.append('username', username)
  appendMountOptions(fd, opts)
  return client.post('/admin/mount', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// POST /admin/mount with uploaded=true
export const adminMountUploadedSource = (filename: string, username: string, opts: MountOptions = {}) => {
  const fd = new FormData()
  fd.append('source', filename)
  fd.append('username', username)
  fd.append('uploaded', 'true')
  appendMountOptions(fd, opts)
  return client.post('/admin/mount', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// POST /admin/mount with remount=true
export const adminRemountSource = (sourceName: string, username: string, opts: MountOptions = {}) => {
  const fd = new FormData()
  fd.append('source', sourceName)
  fd.append('username', username)
  fd.append('remount', 'true')
  appendMountOptions(fd, opts)
  return client.post('/admin/mount', fd).then((r) => ({ message: toApiMessage(r.data) }))
}

// POST /admin/unmount (formdata: source, username)
export const adminUnmountSource = (sourceName: string, username = 'admin') => {
  const fd = new FormData()
  fd.append('source', sourceName)
  fd.append('username', username)
  return client.post('/admin/unmount', fd).then((r) => ({ message: toApiMessage(r.data) }))
}
