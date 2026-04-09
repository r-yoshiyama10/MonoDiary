import type { DiaryEntry, EntriesResponse } from '../types/entry'

const BASE = ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  return res.json() as Promise<T>
}

export interface SearchParams {
  q?: string
  dateFrom?: string
  dateTo?: string
  sort?: 'desc' | 'asc'
}

export const api = {
  getEntries: (cursor?: string, limit = 20, search?: SearchParams): Promise<EntriesResponse> => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (cursor) params.set('cursor', cursor)
    if (search?.q) params.set('q', search.q)
    if (search?.dateFrom) params.set('date_from', search.dateFrom)
    if (search?.dateTo) params.set('date_to', search.dateTo)
    if (search?.sort) params.set('sort', search.sort)
    return request<EntriesResponse>(`/api/entries?${params}`)
  },

  getEntry: (id: string): Promise<DiaryEntry> =>
    request<DiaryEntry>(`/api/entries/${id}`),

  logout: (): Promise<void> =>
    request<void>('/auth/logout', { method: 'POST' }),
}
