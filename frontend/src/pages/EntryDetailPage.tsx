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
        className="mb-8 flex items-center gap-1.5 text-sm text-stone-400 transition hover:text-stone-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
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
          {/* 日付ヘッダー */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <p className="text-xs font-medium tracking-wide text-stone-400">
              {formatDate(entry.created_at)}
            </p>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          {/* 日記本文 */}
          <section className="rounded-2xl bg-white p-7 ring-1 ring-stone-200 shadow-[0_2px_12px_rgba(120,100,80,0.07)]">
            <h2 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-300">
              diary
            </h2>
            <p className="whitespace-pre-wrap text-[1.05rem] leading-[2] tracking-wide text-stone-800">
              {entry.diary_text}
            </p>
          </section>

          {/* 原文 */}
          <section className="rounded-2xl bg-[#f0ece4] p-7">
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              original · LINE
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-[1.9] text-stone-500">
              {entry.source_text}
            </p>
          </section>
        </article>
      )}
    </Layout>
  )
}
