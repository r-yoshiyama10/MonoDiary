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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getEntry(id)
      .then(setEntry)
      .catch(() => setError('エントリの取得に失敗しました。'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await api.deleteEntry(id)
      navigate('/entries')
    } catch {
      setError('削除に失敗しました。')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate('/entries')}
          className="flex items-center gap-1.5 text-sm text-stone-400 transition hover:text-stone-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          <span>一覧に戻る</span>
        </button>

        {entry && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-sm text-stone-400 transition hover:text-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
            </svg>
            <span>削除</span>
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-stone-800">この日記を削除しますか？</h3>
            <p className="mb-6 text-sm text-stone-500">削除した日記は元に戻せません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? '削除中…' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

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
