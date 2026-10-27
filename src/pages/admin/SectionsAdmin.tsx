import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2, UserMinus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSections } from '../../hooks/useSections'
import type { Section } from '../../lib/types'
import { Card, Msg, SectionBadge } from '../../components/ui'

interface Coach { section_id: string; user_id: string; profiles: { full_name: string; email: string } }

/** Только для главного админа: секции и их тренеры */
export default function SectionsAdmin() {
  const { sections, reload } = useSections()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [newName, setNewName] = useState('')
  const [emails, setEmails] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const loadCoaches = useCallback(async () => {
    const { data } = await supabase.from('section_coaches').select('section_id, user_id, profiles(full_name, email)')
    setCoaches((data ?? []) as unknown as Coach[])
  }, [])
  useEffect(() => { loadCoaches() }, [loadCoaches])

  const fail = (text: string) => setMsg({ kind: 'err', text })

  const addSection = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('sections').insert({ name: newName.trim() })
    if (error) return fail(error.code === '23505' ? 'Секция с таким названием уже есть' : error.message)
    setNewName(''); setMsg(null); reload()
  }

  const patch = async (s: Section, p: Partial<Section>) => {
    const { error } = await supabase.from('sections').update(p).eq('id', s.id)
    if (error) fail(error.message)
    reload()
  }

  const removeSection = async (s: Section) => {
    if (!confirm(`Удалить секцию «${s.name}» вместе с занятиями и отметками?`)) return
    const { error } = await supabase.from('sections').delete().eq('id', s.id)
    if (error) fail(error.message)
    reload()
  }

  const addCoach = async (s: Section) => {
    const email = (emails[s.id] ?? '').trim().toLowerCase()
    if (!email) return
    const { data } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
    if (!data) return fail('Такой пользователь ещё не зарегистрирован: пусть сначала войдёт в приложение со своей почтой')
    const { error } = await supabase.from('section_coaches').insert({ section_id: s.id, user_id: data.id })
    if (error) return fail(error.code === '23505' ? 'Этот человек уже тренер секции' : error.message)
    setEmails({ ...emails, [s.id]: '' }); setMsg({ kind: 'ok', text: 'Тренер назначен' }); loadCoaches()
  }

  const removeCoach = async (c: Coach) => {
    await supabase.from('section_coaches').delete().eq('section_id', c.section_id).eq('user_id', c.user_id)
    loadCoaches()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Секции и тренеры</h1>
      {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
      <Card>
        <form onSubmit={addSection} className="flex gap-2">
          <input className="field min-w-0 flex-1" required placeholder="Новая секция" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn !px-4" aria-label="Добавить секцию"><Plus size={20} /></button>
        </form>
      </Card>
      {sections.map((s) => (
        <Card key={s.id} className="space-y-3 !p-4">
          <div className="flex items-center gap-3">
            <SectionBadge name={s.name} color={s.color} size={44} />
            <input className="field min-w-0 flex-1 font-bold" defaultValue={s.name} onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && patch(s, { name: e.target.value.trim() })} />
            <input type="color" aria-label="Цвет" defaultValue={s.color} onBlur={(e) => e.target.value !== s.color && patch(s, { color: e.target.value })} className="size-11 shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
            <button className="btn-ghost !px-3 !text-rose-600" aria-label="Удалить секцию" onClick={() => removeSection(s)}><Trash2 size={18} /></button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">Тренеры</p>
            {coaches.filter((c) => c.section_id === s.id).map((c) => (
              <div key={c.user_id} className="flex items-center justify-between rounded-2xl bg-white/60 py-1 pl-3 pr-1 text-sm">
                <span className="min-w-0 truncate">{c.profiles?.full_name || c.profiles?.email} <span className="text-slate-400">{c.profiles?.email}</span></span>
                <button aria-label="Снять с секции" className="grid size-11 shrink-0 place-items-center text-rose-600" onClick={() => removeCoach(c)}><UserMinus size={18} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="field min-w-0 flex-1" type="email" placeholder="Почта тренера" value={emails[s.id] ?? ''} onChange={(e) => setEmails({ ...emails, [s.id]: e.target.value })} />
              <button className="btn-ghost" onClick={() => addCoach(s)}>Назначить</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
