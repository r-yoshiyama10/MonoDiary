import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
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

export function EntriesPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  const load = async (nextCursor?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getEntries(nextCursor)
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
    load()
  }, [])

  return (
    <Layout>
      <h2 className="mb-6 text-xl font-semibold text-stone-800">日記一覧</h2>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {!loading && entries.length === 0 && !error && (
        <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-stone-200">
          <p className="text-stone-400">まだ日記がありません。</p>
          <p className="mt-1 text-sm text-stone-300">
            LINE にメッセージを送って最初の日記を作りましょう。
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            onClick={() => navigate(`/entries/${entry.id}`)}
            className="cursor-pointer rounded-2xl bg-white p-5 shadow-xs ring-1 ring-stone-200 transition hover:ring-stone-400"
          >
            <p className="mb-1 text-xs text-stone-400">{formatDate(entry.created_at)}</p>
            <p className="text-sm leading-relaxed text-stone-700">
              {excerpt(entry.diary_text)}
            </p>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => load(cursor ?? undefined)}
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
