import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface Ctx { session: Session | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<unknown> }
const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: Session | null) => {
    if (!s) return setProfile(null)
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
    setProfile(data as Profile | null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await load(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // вне колбэка, иначе supabase-js может зависнуть на запросе внутри onAuthStateChange
      setTimeout(() => load(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  return (
    <AuthCtx.Provider value={{ session, profile, loading, refresh: () => load(session), signOut: () => supabase.auth.signOut() }}>
      {children}
    </AuthCtx.Provider>
  )
}
