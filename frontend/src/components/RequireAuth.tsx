import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api'

interface Props {
  children: React.ReactNode
}

export function RequireAuth({ children }: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'unauth' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (status !== 'loading') return
    api
      .getEntries(undefined, 1)
      .then(() => setStatus('ok'))
      .catch((e: Error) => {
        if (e.message === 'UNAUTHORIZED') {
          setStatus('unauth')
        } else {
          setStatus('error')
        }
      })
  }, [attempt, status])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-stone-700" />
      </div>
    )
  }

  if (status === 'unauth') {
    return <Navigate to="/login" replace />
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 text-stone-600">
        <p className="text-sm">サーバーに接続できません</p>
        <button
          className="text-sm underline"
          onClick={() => { setStatus('loading'); setAttempt(a => a + 1) }}
        >
          再試行
        </button>
      </div>
    )
  }

  return <>{children}</>
}
