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
    <div className="min-h-screen bg-[#f4ede0]">
      <header style={{ background: '#3d2e1e', borderBottom: '1px solid #4e3c28' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4" style={{ height: 56 }}>
          <span
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: '#f0e4cc', letterSpacing: '0.05em', cursor: 'pointer' }}
            onClick={() => navigate('/entries')}
          >
            MonoDiary
          </span>
          <button onClick={handleLogout} style={{ fontSize: 11, color: '#7a6040' }}>
            ログアウト
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  )
}
