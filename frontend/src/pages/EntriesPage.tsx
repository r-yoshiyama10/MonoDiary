import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { SearchParams } from '../lib/api'
import { Layout } from '../components/Layout'
import type { DiaryEntry } from '../types/entry'

function formatDateParts(iso: string) {
  const d = new Date(iso)
  return {
    year: d.getFullYear(),
    monthStr: `${d.getMonth() + 1}月`,
    day: d.getDate(),
    weekday: d.toLocaleDateString('ja-JP', { weekday: 'short' }),
  }
}

function excerpt(text: string, len = 65) {
  return text.length > len ? text.slice(0, len) + '…' : text
}

const EMPTY_SEARCH: SearchParams = { q: '', dateFrom: '', dateTo: '', sort: 'desc' }

export function EntriesPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<SearchParams>(EMPTY_SEARCH)
  const [appliedSearch, setAppliedSearch] = useState<SearchParams>(EMPTY_SEARCH)
  const [searchOpen, setSearchOpen] = useState(false)
  const initialized = useRef(false)

  const load = async (nextCursor: string | undefined, search: SearchParams) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getEntries(nextCursor, 20, search)
      setEntries((prev) => (nextCursor ? [...prev, ...data.items] : data.items))
      setCursor(data.next_cursor)
      setHasMore(data.next_cursor !== null)
    } catch {
      setError('データの取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    load(undefined, EMPTY_SEARCH)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedSearch(form)
    setEntries([])
    setCursor(null)
    setHasMore(true)
    load(undefined, form)
  }

  const handleReset = () => {
    setForm(EMPTY_SEARCH)
    setAppliedSearch(EMPTY_SEARCH)
    setEntries([])
    setCursor(null)
    setHasMore(true)
    setSearchOpen(false)
    load(undefined, EMPTY_SEARCH)
  }

  const isFiltered =
    !!appliedSearch.q || !!appliedSearch.dateFrom || !!appliedSearch.dateTo || appliedSearch.sort === 'asc'

  return (
    <Layout>
      {/* ヘッダー行 */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p style={{ fontSize: 10, color: '#a89a8c', letterSpacing: '0.12em', marginBottom: 4 }}>
            {new Date().getFullYear()}年{new Date().getMonth() + 1}月
          </p>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1a160e', letterSpacing: '-0.01em', fontFamily: "'Noto Sans JP', sans-serif" }}>
            日記一覧
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm transition hover:opacity-80"
          style={{ borderColor: '#e4dace', background: '#fffef9', color: '#6b6254', boxShadow: '0 1px 4px rgba(80,60,20,0.06)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <span>絞り込み</span>
          {isFiltered && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: '#c49a50' }}>
              {[appliedSearch.q, appliedSearch.dateFrom, appliedSearch.dateTo, appliedSearch.sort === 'asc' ? '1' : ''].filter(Boolean).length}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${searchOpen ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* 検索フォーム（アコーディオン） */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${searchOpen ? 'max-h-[500px] opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
        <form
          onSubmit={handleSearch}
          className="rounded-2xl p-5 space-y-4"
          style={{ background: '#fffef9', border: '1px solid #e4dace', boxShadow: '0 2px 12px rgba(80,60,20,0.07)' }}
        >
          {/* フリーワード */}
          <div>
            <label className="block mb-1 text-xs font-medium" style={{ color: '#6b6254' }}>キーワード</label>
            <div className="relative">
              <input
                type="text"
                value={form.q}
                onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
                placeholder="日記・原文を検索…"
                className="w-full rounded-xl px-3 py-2 pr-8 text-sm outline-none transition"
                style={{ border: '1px solid #e4dace', background: '#f4ede0', color: '#1a160e' }}
              />
              {form.q && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, q: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition"
                  style={{ color: '#a89a8c' }}
                  aria-label="クリア"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* 日付範囲 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block mb-1 text-xs font-medium" style={{ color: '#6b6254' }}>開始日</label>
              <input
                type="date"
                value={form.dateFrom}
                max={form.dateTo || undefined}
                onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none transition"
                style={{ border: '1px solid #e4dace', background: '#f4ede0', color: '#1a160e' }}
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-xs font-medium" style={{ color: '#6b6254' }}>終了日</label>
              <input
                type="date"
                value={form.dateTo}
                min={form.dateFrom || undefined}
                onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none transition"
                style={{ border: '1px solid #e4dace', background: '#f4ede0', color: '#1a160e' }}
              />
            </div>
          </div>

          {/* ソート順 */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium shrink-0" style={{ color: '#6b6254' }}>並び順</label>
            <div className="flex rounded-xl overflow-hidden text-sm" style={{ border: '1px solid #e4dace' }}>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sort: 'desc' }))}
                className="px-4 py-1.5 transition"
                style={form.sort !== 'asc' ? { background: '#3d2e1e', color: '#f0e4cc' } : { background: '#fffef9', color: '#6b6254' }}
              >
                新しい順
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sort: 'asc' }))}
                className="px-4 py-1.5 transition"
                style={form.sort === 'asc' ? { background: '#3d2e1e', color: '#f0e4cc' } : { background: '#fffef9', color: '#6b6254' }}
              >
                古い順
              </button>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl px-5 py-2 text-sm transition disabled:opacity-40"
              style={{ background: '#3d2e1e', color: '#f0e4cc' }}
            >
              検索
            </button>
            {isFiltered && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl px-5 py-2 text-sm transition"
                style={{ border: '1px solid #e4dace', background: '#fffef9', color: '#6b6254' }}
              >
                リセット
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {/* 区切り線 */}
      {!loading && entries.length > 0 && (
        <div className="flex items-center gap-2.5 mb-4">
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #c49a50, transparent)' }} />
          <span style={{ fontSize: 10, color: '#a89a8c', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
            {entries.length} entries
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, #c49a50, transparent)' }} />
        </div>
      )}

      {!loading && entries.length === 0 && !error && (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#fffef9', border: '1px solid #e4dace', boxShadow: '0 2px 12px rgba(80,60,20,0.07)' }}>
          {isFiltered ? (
            <p style={{ color: '#a89a8c' }}>条件に一致する日記が見つかりませんでした。</p>
          ) : (
            <>
              <p style={{ color: '#a89a8c' }}>まだ日記がありません。</p>
              <p className="mt-1 text-sm" style={{ color: '#c0a870' }}>
                LINE にメッセージを送って最初の日記を作りましょう。
              </p>
            </>
          )}
        </div>
      )}

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {entries.map((entry) => {
          const { monthStr, day, weekday } = formatDateParts(entry.created_at)
          return (
            <li key={entry.id}>
              <Link to={`/entries/${entry.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-offset-2" style={{ borderRadius: 12 }}>
                <div style={{
                  background: '#fffef9',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(80,60,20,0.08), 0 4px 14px rgba(80,60,20,0.05)',
                  border: '1px solid #e4dace',
                  display: 'flex',
                }}>
                  {/* 日付カラム */}
                  <div style={{
                    width: 75,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 0',
                    borderRight: '1px solid #e4dace',
                    gap: 3,
                  }}>
                    <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 11, fontWeight: 600, color: '#c49a50', letterSpacing: '0.04em' }}>
                      {monthStr}
                    </span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 400, color: '#1a160e', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {day}
                    </span>
                    <span style={{ fontSize: 10, color: '#a89a8c', fontFamily: "'Noto Sans JP', sans-serif" }}>
                      ({weekday})
                    </span>
                  </div>

                  {/* 本文カラム */}
                  <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                    <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13, lineHeight: 1.88, color: '#352a18' }}>
                      {excerpt(entry.source_text, 65)}
                    </p>
                    {entry.ai_comment && (
                      <p style={{ fontSize: 10, color: '#a89a8c', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
                        — AIコメントあり
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {hasMore && entries.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => load(cursor ?? undefined, appliedSearch)}
            disabled={loading}
            className="rounded-xl px-6 py-2 text-sm transition disabled:opacity-40"
            style={{ border: '1px solid #e4dace', background: '#fffef9', color: '#6b6254' }}
          >
            {loading ? '読み込み中…' : 'もっと見る'}
          </button>
        </div>
      )}

      {loading && entries.length === 0 && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: '#e4dace', borderTopColor: '#c49a50' }} />
        </div>
      )}
    </Layout>
  )
}
