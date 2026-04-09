import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .getEntry(id)
      .then(setEntry)
      .catch(() => setError('エントリの取得に失敗しました。'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <Layout>
      <button
        onClick={() => navigate('/entries')}
        className="mb-6 flex items-center gap-1 text-sm text-stone-400 transition hover:text-stone-700"
      >
        <span>←</span>
        <span>一覧に戻る</span>
      </button>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-stone-700" />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {entry && (
        <article className="space-y-6">
          <p className="text-sm text-stone-400">{formatDate(entry.created_at)}</p>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-stone-200 shadow-[0_2px_12px_rgba(120,100,80,0.07)]">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
              日記
            </h2>
            <p className="whitespace-pre-wrap leading-loose text-stone-800">
              {entry.diary_text}
            </p>
          </section>

          <section className="rounded-2xl bg-[#f0ece4] p-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
              原文（LINE メッセージ）
            </h2>
            <p className="whitespace-pre-wrap leading-loose text-stone-500">
              {entry.source_text}
            </p>
          </section>
        </article>
      )}
    </Layout>
  )
}
