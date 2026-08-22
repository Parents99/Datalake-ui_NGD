import { client, toApiMessage, unwrapSdl } from './client'

// GET /describe?source=<name>
export const describeSource = (sourceName: string) =>
  client.get('/describe', { params: { source: sourceName } }).then((r) => unwrapSdl(r.data))

// GET /profile?source=<name>&rollUp=false or /profile?source=<name>&domain=<domain>&rollUp=false
export const profileSource = (sourceName: string, domain?: string, rollUp = false) =>
  client
    .get('/profile', { params: { source: sourceName, rollUp: String(rollUp), ...(domain ? { domain } : {}) } })
    .then((r) => unwrapSdl(r.data))

// GET /estimate?sources=<a>&sources=<b>
export const estimateSources = (sources: string[]) =>
  client.get('/estimate', { params: { sources } }).then((r) => unwrapSdl(r.data))

// The Flask backend only supports global confirmation through /clean?all=y|n.
export const cleanSources = (all: boolean) =>
  client.get('/clean', { params: { all: all ? 'y' : 'n' } }).then((r) => ({ message: toApiMessage(r.data) }))

// --- Admin variants ---

export const adminDescribeSource = (sourceName: string, username?: string) =>
  client.get('/admin/describe', { params: { source: sourceName, ...(username ? { username } : {}) } }).then((r) => unwrapSdl(r.data))

export const adminProfileSource = (sourceName: string, domain?: string, rollUp = false, username?: string) =>
  client
    .get('/admin/profile', {
      params: { source: sourceName, rollUp: String(rollUp), ...(domain ? { domain } : {}), ...(username ? { username } : {}) },
    })
    .then((r) => unwrapSdl(r.data))

export const adminEstimateSources = (sources: string[], usernames?: string[]) =>
  client.get('/admin/estimate', { params: { sources, ...(usernames ? { usernames } : {}) } }).then((r) => unwrapSdl(r.data))

export const adminCleanSources = (all: boolean, username?: string) =>
  client
    .get('/admin/clean', { params: { all: all ? 'y' : 'n', ...(username ? { username } : {}) } })
    .then((r) => ({ message: toApiMessage(r.data) }))

// POST /admin/query - raw SPARQL body
export const adminQuery = (sparql: string) =>
  client.post('/admin/query', sparql, {
    headers: { 'Content-Type': 'text/plain' },
  }).then((r) => unwrapSdl(r.data))
