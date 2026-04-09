import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { SearchParams } from '../lib/api'
import { Layout } from '../components/Layout'
import type { DiaryEntry } from '../types/entry'

function formatDateParts(iso: string) {
  const d = new Date(iso)
  return {
    year: d.toLocaleDateString('ja-JP', { year: 'numeric' }),
    monthDay: d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }),
    weekday: d.toLocaleDateString('ja-JP', { weekday: 'short' }),
  }
}

function excerpt(text: string, len = 80) {
  return text.length > len ? text.slice(0, len) + '…' : text
}

const EMPTY_SEARCH: SearchParams = { q: '', dateFrom: '', dateTo: '', sort: 'desc' }

export function EntriesPage() {
  const navigate = useNavigate()
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
        <h2 className="text-xl font-semibold text-stone-800">日記一覧</h2>
        <button
          type="button"
          onClick={() => setSearchOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-sm text-stone-500 shadow-[0_1px_4px_rgba(120,100,80,0.06)] transition hover:bg-stone-50 hover:text-stone-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <span>絞り込み</span>
          {isFiltered && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-700 text-[10px] font-semibold text-white">
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
          className="rounded-2xl bg-white p-5 ring-1 ring-stone-200 shadow-[0_2px_12px_rgba(120,100,80,0.07)] space-y-4"
        >
          {/* フリーワード */}
          <div>
            <label className="block mb-1 text-xs font-medium text-stone-500">キーワード</label>
            <div className="relative">
              <input
                type="text"
                value={form.q}
                onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
                placeholder="日記・原文を検索…"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 pr-8 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:bg-white transition"
              />
              {form.q && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, q: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition"
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
              <label className="block mb-1 text-xs font-medium text-stone-500">開始日</label>
              <input
                type="date"
                value={form.dateFrom}
                max={form.dateTo || undefined}
                onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400 focus:bg-white transition"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-xs font-medium text-stone-500">終了日</label>
              <input
                type="date"
                value={form.dateTo}
                min={form.dateFrom || undefined}
                onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400 focus:bg-white transition"
              />
            </div>
          </div>

          {/* ソート順 */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-stone-500 shrink-0">並び順</label>
            <div className="flex rounded-xl border border-stone-200 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sort: 'desc' }))}
                className={`px-4 py-1.5 transition ${
                  form.sort !== 'asc'
                    ? 'bg-stone-800 text-white'
                    : 'bg-white text-stone-500 hover:bg-stone-50'
                }`}
              >
                新しい順
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sort: 'asc' }))}
                className={`px-4 py-1.5 transition ${
                  form.sort === 'asc'
                    ? 'bg-stone-800 text-white'
                    : 'bg-white text-stone-500 hover:bg-stone-50'
                }`}
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
              className="rounded-xl bg-stone-800 px-5 py-2 text-sm text-white transition hover:bg-stone-700 disabled:opacity-40"
            >
              検索
            </button>
            {isFiltered && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2 text-sm text-stone-500 transition hover:bg-stone-50"
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

      {!loading && entries.length === 0 && !error && (
        <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-stone-200 shadow-[0_2px_12px_rgba(120,100,80,0.07)]">
          {isFiltered ? (
            <p className="text-stone-400">条件に一致する日記が見つかりませんでした。</p>
          ) : (
            <>
              <p className="text-stone-400">まだ日記がありません。</p>
              <p className="mt-1 text-sm text-stone-300">
                LINE にメッセージを送って最初の日記を作りましょう。
              </p>
            </>
          )}
        </div>
      )}

      <ul className="space-y-3">
        {entries.map((entry) => {
          const { year, monthDay, weekday } = formatDateParts(entry.created_at)
          return (
            <li
              key={entry.id}
              onClick={() => navigate(`/entries/${entry.id}`)}
              className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(120,100,80,0.07)] ring-1 ring-stone-200 transition hover:ring-stone-300 hover:shadow-[0_4px_16px_rgba(120,100,80,0.12)]"
            >
              <div className="flex items-stretch">
                {/* 日付カラム */}
                <div className="flex min-w-[84px] flex-col items-center justify-center gap-0.5 bg-[#f7f4ef] px-4 py-5 border-r border-stone-100">
                  <span className="text-[10px] text-stone-400">{year}</span>
                  <span className="text-sm font-semibold text-stone-700 leading-snug">{monthDay}</span>
                  <span className="text-[10px] text-stone-400">{weekday}</span>
                </div>
                {/* 本文カラム */}
                <div className="flex flex-1 items-center px-5 py-5">
                  <p className="text-sm leading-relaxed text-stone-600">{excerpt(entry.diary_text)}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {hasMore && entries.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => load(cursor ?? undefined, appliedSearch)}
            disabled={loading}
            className="rounded-xl border border-stone-300 bg-white px-6 py-2 text-sm text-stone-600 transition hover:bg-stone-50 disabled:opacity-40"
          >
            {loading ? '読み込み中…' : 'もっと見る'}
          </button>
        </div>
      )}

      {loading && entries.length === 0 && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-stone-700" />
        </div>
      )}
    </Layout>
  )
}
