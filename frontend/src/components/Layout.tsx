import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface Props {
  children: React.ReactNode
}

export function Layout({ children }: Props) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <header className="border-b border-stone-200 bg-[#faf8f5]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <span
            className="cursor-pointer text-lg font-semibold tracking-tight text-stone-800"
            onClick={() => navigate('/entries')}
          >
            MonoDiary
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-stone-400 transition hover:text-stone-700"
          >
            ログアウト
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  )
}
