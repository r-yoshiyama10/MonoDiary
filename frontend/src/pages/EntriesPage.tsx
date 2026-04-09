import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { SearchParams } from '../lib/api'
import { Layout } from '../components/Layout'
import type { DiaryEntry } from '../types/entry'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
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
    load(undefined, EMPTY_SEARCH)
  }

  const isFiltered =
    !!appliedSearch.q || !!appliedSearch.dateFrom || !!appliedSearch.dateTo || appliedSearch.sort === 'asc'

  return (
    <Layout>
      <h2 className="mb-5 text-xl font-semibold text-stone-800">日記一覧</h2>

      {/* 検索フォーム */}
      <form
        onSubmit={handleSearch}
        className="mb-6 rounded-2xl bg-white p-5 ring-1 ring-stone-200 shadow-[0_2px_12px_rgba(120,100,80,0.07)] space-y-4"
      >
        {/* フリーワード */}
        <div>
          <label className="block mb-1 text-xs font-medium text-stone-500">キーワード</label>
          <input
            type="text"
            value={form.q}
            onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
            placeholder="日記・原文を検索…"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:bg-white transition"
          />
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
        {entries.map((entry) => (
          <li
            key={entry.id}
            onClick={() => navigate(`/entries/${entry.id}`)}
            className="cursor-pointer rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(120,100,80,0.07)] ring-1 ring-stone-200 transition hover:ring-stone-300 hover:shadow-[0_4px_16px_rgba(120,100,80,0.12)]"
          >
            <p className="mb-1 text-xs text-stone-400">{formatDate(entry.created_at)}</p>
            <p className="text-sm leading-relaxed text-stone-700">{excerpt(entry.diary_text)}</p>
          </li>
        ))}
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
