import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, CalendarDays, ClipboardList, History, Home, LayoutGrid, LogOut, Trophy, UserRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSections } from '../hooks/useSections'
import { Logo, SectionBadge } from './ui'

const student = [
  { to: '/', icon: Home, label: 'Главная' },
  { to: '/sections', icon: LayoutGrid, label: 'Секции' },
  { to: '/history', icon: History, label: 'История' },
  { to: '/profile', icon: UserRound, label: 'Профиль' },
]
const manager = [
  { to: '/admin', icon: BarChart3, label: 'Статистика' },
  { to: '/admin/events', icon: CalendarDays, label: 'Расписание' },
  { to: '/admin/log', icon: ClipboardList, label: 'Журнал' },
]
const adminOnly = { to: '/admin/sections', icon: Trophy, label: 'Секции' }

export default function Layout() {
  const { signOut } = useAuth()
  const { isManager, isAdmin, manageable, current, setCurrent } = useSections()
  const tabs = isManager ? (isAdmin ? [...manager, adminOnly] : manager) : student
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-32 pt-4">
      <header className="mb-5 flex items-center justify-between">
        <Logo />
        <button onClick={signOut} aria-label="Выйти" className="btn-ghost !px-3"><LogOut size={20} /></button>
      </header>
      {isManager && current && (
        <div className="mb-4 flex items-center gap-3">
          <SectionBadge name={current.name} color={current.color} size={40} />
          <select className="field !min-h-[44px] font-semibold" value={current.id} onChange={(e) => setCurrent(e.target.value)} aria-label="Секция">
            {manageable.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
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
