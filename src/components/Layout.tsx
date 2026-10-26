import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, CalendarDays, ClipboardList, History, Home, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Logo } from './ui'

const student = [
  { to: '/', icon: Home, label: 'Главная' },
  { to: '/history', icon: History, label: 'История' },
  { to: '/profile', icon: UserRound, label: 'Профиль' },
]
const admin = [
  { to: '/admin', icon: BarChart3, label: 'Статистика' },
  { to: '/admin/events', icon: CalendarDays, label: 'Расписание' },
  { to: '/admin/log', icon: ClipboardList, label: 'Журнал' },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const tabs = profile?.role === 'admin' ? admin : student
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-32 pt-4">
      <header className="mb-5 flex items-center justify-between">
        <Logo />
        <button onClick={signOut} aria-label="Выйти" className="btn-ghost !px-3"><LogOut size={20} /></button>
      </header>
      <Outlet />
      <p className="mt-6 text-center text-xs text-slate-400">версия {__BUILD__}</p>
      <nav className="glass fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-md justify-around p-2" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 rounded-3xl py-2 text-xs font-semibold ${isActive ? 'bg-white/80 text-brand shadow' : 'text-slate-500'}`}
          >
            <Icon size={22} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
