import { Navigate, Route, Routes } from 'react-router-dom'
import { configured } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { useSections } from './hooks/useSections'
import Layout from './components/Layout'
import { Card, Logo, Spinner } from './components/ui'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Home from './pages/Home'
import History from './pages/History'
import MySections from './pages/MySections'
import Dashboard from './pages/admin/Dashboard'
import Events from './pages/admin/Events'
import Log from './pages/admin/Log'
import SectionsAdmin from './pages/admin/SectionsAdmin'

function Setup() {
  return (
    <div className="mx-auto max-w-md p-6">
      <Card className="space-y-3">
        <Logo />
        <p className="font-semibold">Supabase не настроен</p>
        <p className="text-sm text-slate-600">
          Скопируйте <code>.env.example</code> в <code>.env</code>, впишите <code>VITE_SUPABASE_URL</code> и{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> и перезапустите <code>npm run dev</code>. Подробности — в README.
        </p>
      </Card>
    </div>
  )
}

export default function App() {
  const { session, profile, loading } = useAuth()
  const { isManager, isAdmin, loading: loadingSections } = useSections()
  if (!configured) return <Setup />
  if (loading) return <Spinner />
  if (!session) return <Login />
  if (!profile?.full_name) return <Profile first />
  if (loadingSections) return <Spinner />

  return (
    <Routes>
      <Route element={<Layout />}>
        {isManager ? (
          <>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/events" element={<Events />} />
            <Route path="/admin/log" element={<Log />} />
            {isAdmin && <Route path="/admin/sections" element={<SectionsAdmin />} />}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/sections" element={<MySections />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Route>
    </Routes>
  )
}
