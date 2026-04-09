import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api'

interface Props {
  children: React.ReactNode
}

export function RequireAuth({ children }: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'unauth'>('loading')

  useEffect(() => {
    api
      .getEntries(undefined, 1)
      .then(() => setStatus('ok'))
      .catch((e: Error) => {
        if (e.message === 'UNAUTHORIZED') {
          setStatus('unauth')
        } else {
          setStatus('ok')
        }
      })
  }, [])

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

  return <>{children}</>
}
