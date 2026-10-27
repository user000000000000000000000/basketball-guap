import { useState } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSections } from '../hooks/useSections'
import { Card, Msg, SectionBadge } from '../components/ui'

/** Студент отмечает секции, в которых занимается — на главной он увидит только их тренировки */
export default function MySections() {
  const { session } = useAuth()
  const { sections, mine, reload } = useSections()
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = async (id: string) => {
    setBusy(id); setErr('')
    const uid = session!.user.id
    const { error } = mine.has(id)
      ? await supabase.from('section_members').delete().eq('section_id', id).eq('user_id', uid)
      : await supabase.from('section_members').insert({ section_id: id, user_id: uid })
    if (error) setErr(error.message)
    await reload()
    setBusy(null)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Мои секции</h1>
      <p className="text-sm text-slate-600">Отметьте секции, в которых занимаетесь, — тренировки появятся на главной.</p>
      {err && <Msg kind="err">{err}</Msg>}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((s) => {
          const on = mine.has(s.id)
          return (
            <button
              key={s.id}
              disabled={busy === s.id}
              onClick={() => toggle(s.id)}
              className={`glass relative flex flex-col items-center gap-2 p-4 text-center font-semibold transition ${on ? 'ring-2 ring-brand' : 'opacity-90'}`}
            >
              <SectionBadge name={s.name} color={s.color} size={56} />
              <span className="text-sm leading-tight">{s.name}</span>
              {on && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-brand text-white"><Check size={14} /></span>}
            </button>
          )
        })}
      </div>
      {sections.length === 0 && <Card className="text-center text-slate-500">Секций пока нет</Card>}
    </div>
  )
}
