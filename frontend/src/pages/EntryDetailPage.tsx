import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, HttpError } from '../lib/api'
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
      .catch((e: unknown) => {
        if (e instanceof HttpError && e.status === 404) {
          setError('この日記は見つかりませんでした。一覧から選び直してください。')
          return
        }
        setError('エントリの取得に失敗しました。通信環境を確認して、しばらくしてから再度お試しください。')
      })
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
          className="flex items-center gap-1.5 transition hover:opacity-70"
          style={{ fontSize: 12, color: '#6b6254' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          <span>一覧に戻る</span>
        </button>

        {entry && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 transition hover:opacity-70"
            style={{ fontSize: 12, color: '#b07070' }}
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
          <div className="mx-4 w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ background: '#fffef9', border: '1px solid #e4dace' }}>
            <h3 className="mb-2 text-base font-semibold" style={{ color: '#1a160e' }}>この日記を削除しますか？</h3>
            <p className="mb-6 text-sm" style={{ color: '#6b6254' }}>削除した日記は元に戻せません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-50"
                style={{ border: '1px solid #e4dace', color: '#6b6254', background: '#f4ede0' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#b07070' }}
              >
                {deleting ? '削除中…' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: '#e4dace', borderTopColor: '#c49a50' }} />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {entry && (
        <article className="space-y-6">
          {/* 日付ヘッダー */}
          {(() => {
            const { year, monthStr, day, weekday } = formatDateParts(entry.created_at)
            return (
              <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #e4dace', position: 'relative' }}>
                <p style={{ fontSize: 10, color: '#a89a8c', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'Noto Sans JP', sans-serif" }}>
                  {year}年
                </p>
                <p style={{ lineHeight: 1.1, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15, fontWeight: 600, color: '#c49a50', verticalAlign: 'baseline' }}>
                    {monthStr}
                  </span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 300, color: '#1a160e', letterSpacing: '-0.02em', verticalAlign: 'baseline' }}>
                    {day}
                  </span>
                  <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20, fontWeight: 300, color: '#1a160e', verticalAlign: 'baseline' }}>
                    日
                  </span>
                  <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, color: '#6b6254', marginLeft: 6, verticalAlign: 'baseline' }}>
                    （{weekday}）
                  </span>
                </p>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 48, height: 2, background: 'linear-gradient(90deg, #c49a50, transparent)' }} />
              </div>
            )
          })()}

          {/* 日記本文（原文） */}
          <section style={{
            background: '#fffef9',
            borderRadius: 12,
            padding: '20px 18px',
            marginBottom: 14,
            border: '1px solid #e4dace',
            boxShadow: '0 2px 10px rgba(80,60,20,0.07)',
          }}>
            <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c0a870', marginBottom: 16, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
              diary
            </p>
            <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15, lineHeight: 2.15, color: '#1a160e', letterSpacing: '0.03em', whiteSpace: 'pre-wrap' }}>
              {entry.source_text}
            </p>
          </section>

          {/* AI コメント */}
          {entry.ai_comment && (
            <section style={{ borderLeft: '3px solid #c49a50', paddingLeft: 16, paddingTop: 4, paddingBottom: 4 }}>
              <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c49a50', marginBottom: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
                AI comment
              </p>
              <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13.5, lineHeight: 2.05, color: '#5c4e3a', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                {entry.ai_comment}
              </p>
            </section>
          )}
        </article>
      )}
    </Layout>
  )
}
