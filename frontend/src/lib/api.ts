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

  return res.json() as Promise<T>
}

export const api = {
  getEntries: (cursor?: string, limit = 20): Promise<EntriesResponse> => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (cursor) params.set('cursor', cursor)
    return request<EntriesResponse>(`/api/entries?${params}`)
  },

  getEntry: (id: string): Promise<DiaryEntry> =>
    request<DiaryEntry>(`/api/entries/${id}`),

  logout: (): Promise<void> =>
    request<void>('/auth/logout', { method: 'POST' }),
}
