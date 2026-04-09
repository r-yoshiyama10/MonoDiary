import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { EntriesPage } from './pages/EntriesPage'
import { EntryDetailPage } from './pages/EntryDetailPage'
import { RequireAuth } from './components/RequireAuth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/entries"
          element={
            <RequireAuth>
              <EntriesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/entries/:id"
          element={
            <RequireAuth>
              <EntryDetailPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/entries" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
