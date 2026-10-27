import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import { Check, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { GYM } from '../lib/config'
import { distanceM, isOpen } from '../lib/geo'
import { useAuth } from '../hooks/useAuth'
import { useGeolocation } from '../hooks/useGeolocation'
import { useSections } from '../hooks/useSections'
import type { EventRow } from '../lib/types'
import { Card, fmtDate, fmtTime, Msg, SectionBadge, Spinner } from '../components/ui'

export default function Home() {
  const { session } = useAuth()
  const { sections, mine } = useSections()
  const { locate, loading: locating } = useGeolocation()
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [all, setAll] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const [ev, at] = await Promise.all([
      supabase.from('events').select('*').gte('date', today).lte('date', format(addDays(new Date(), 7), 'yyyy-MM-dd')).order('date').order('start_time'),
      supabase.from('attendance').select('event_id').eq('user_id', session!.user.id),
    ])
    setEvents((ev.data ?? []) as EventRow[])
    setDone(new Set((at.data ?? []).map((a) => a.event_id)))
  }, [session])

  useEffect(() => { load() }, [load])

  const checkIn = async (e: EventRow) => {
    setMsg(null)
    setBusyId(e.id)
    try {
      const pos = await locate()
      const sec = sections.find((s) => s.id === e.section_id)
      const target = { lat: e.lat ?? sec?.lat ?? GYM.lat, lng: e.lng ?? sec?.lng ?? GYM.lng }
      const d = distanceM(pos.latitude, pos.longitude, target.lat, target.lng)
      if (d > GYM.radiusM) throw new Error(`Вы не на месте проведения (до зала ~${Math.round(d)} м)`)
      const { error } = await supabase.from('attendance').insert({ user_id: session!.user.id, event_id: e.id })
      if (error) throw new Error(error.code === '23505' ? 'Вы уже отмечены' : error.message)
      setMsg({ kind: 'ok', text: 'Отметка поставлена!' })
      await load()
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message })
    }
    setBusyId(null)
  }

  if (!events) return <Spinner />
  const shown = all ? events : events.filter((e) => mine.has(e.section_id))
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ближайшие тренировки</h1>
      <div className="flex gap-2">
        {[{ v: false, label: 'Мои секции' }, { v: true, label: 'Все секции' }].map((t) => (
          <button key={t.label} onClick={() => setAll(t.v)} className={`btn-ghost flex-1 ${all === t.v ? '!bg-white !text-brand shadow' : ''}`}>{t.label}</button>
        ))}
      </div>
      {mine.size === 0 && !all && (
        <Card className="space-y-3 text-center">
          <p className="font-semibold">Вы пока не выбрали секции</p>
          <Link to="/sections" className="btn">Выбрать секции</Link>
        </Card>
      )}
      {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
      {shown.length === 0 && (mine.size > 0 || all) && <Card className="text-center text-slate-500">На ближайшую неделю ничего не запланировано</Card>}
      {shown.map((e) => {
        const sec = sections.find((s) => s.id === e.section_id)
        return (
          <Card key={e.id} className={`space-y-3 ${isOpen(e) && !done.has(e.id) ? 'ring-2 ring-brand/60' : ''}`}>
            <div className="flex items-center gap-3">
              {sec && <SectionBadge name={sec.name} color={sec.color} />}
              <div>
                <p className="text-lg font-bold">{sec?.name ?? e.title}{e.title && sec && e.title !== sec.name ? ` · ${e.title}` : ''}</p>
                <p className="text-slate-600">{fmtDate(e.date)}, {fmtTime(e.start_time)}–{fmtTime(e.end_time)}</p>
              </div>
            </div>
            {done.has(e.id) ? (
              <p className="flex items-center gap-2 font-semibold text-emerald-700"><Check size={20} /> Вы отмечены</p>
            ) : isOpen(e) ? (
              <button className="btn w-full" disabled={locating || busyId === e.id} onClick={() => checkIn(e)}>
                <MapPin size={20} /> {busyId === e.id ? 'Определяем местоположение…' : 'Отметиться'}
              </button>
            ) : (
              <p className="text-sm text-slate-500">Отметка откроется за 30 минут до начала, потом кнопка станет активной</p>
            )}
          </Card>
        )
      })}
    </div>
  )
}
