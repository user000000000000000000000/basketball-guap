import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Section } from '../lib/types'

interface Ctx {
  sections: Section[]
  mine: Set<string>        // секции, в которых студент занимается
  coachOf: Set<string>     // секции, где пользователь — тренер
  isAdmin: boolean
  isManager: boolean       // главный админ или тренер хотя бы одной секции
  manageable: Section[]    // что можно вести: админу — все, тренеру — свои
  current: Section | null  // выбранная секция в админ-панели
  setCurrent: (id: string) => void
  loading: boolean
  reload: () => Promise<void>
}
const SectionsCtx = createContext<Ctx>(null!)
export const useSections = () => useContext(SectionsCtx)

const KEY = 'ssk.section'
const saved = () => { try { return localStorage.getItem(KEY) } catch { return null } }

export function SectionsProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth()
  const [sections, setSections] = useState<Section[]>([])
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [coachOf, setCoachOf] = useState<Set<string>>(new Set())
  const [currentId, setCurrentId] = useState<string | null>(saved())
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!session) { setLoading(false); return }
    const uid = session.user.id
    const [s, m, c] = await Promise.all([
      supabase.from('sections').select('*').order('name'),
      supabase.from('section_members').select('section_id').eq('user_id', uid),
      supabase.from('section_coaches').select('section_id').eq('user_id', uid),
    ])
    setSections((s.data ?? []) as Section[])
    setMine(new Set((m.data ?? []).map((r) => r.section_id)))
    setCoachOf(new Set((c.data ?? []).map((r) => r.section_id)))
    setLoading(false)
  }, [session])
  useEffect(() => { reload() }, [reload])

  const isAdmin = profile?.role === 'admin'
  const manageable = isAdmin ? sections : sections.filter((x) => coachOf.has(x.id))
  const current = manageable.find((x) => x.id === currentId) ?? manageable[0] ?? null
  const setCurrent = (id: string) => {
    setCurrentId(id)
    try { localStorage.setItem(KEY, id) } catch { /* без localStorage просто не запоминаем */ }
  }

  return (
    <SectionsCtx.Provider value={{ sections, mine, coachOf, isAdmin, isManager: isAdmin || coachOf.size > 0, manageable, current, setCurrent, loading, reload }}>
      {children}
    </SectionsCtx.Provider>
  )
}
