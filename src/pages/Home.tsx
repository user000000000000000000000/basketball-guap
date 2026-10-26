import { useCallback, useEffect, useState } from 'react'
import { addDays, format } from 'date-fns'
import { Check, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { GYM } from '../lib/config'
import { distanceM, isOpen } from '../lib/geo'
import { useAuth } from '../hooks/useAuth'
import { useGeolocation } from '../hooks/useGeolocation'
import type { EventRow } from '../lib/types'
import { Card, fmtDate, fmtTime, Msg, Spinner } from '../components/ui'

export default function Home() {
  const { session } = useAuth()
  const { locate, loading: locating } = useGeolocation()
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
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
      const target = { lat: e.lat ?? GYM.lat, lng: e.lng ?? GYM.lng }
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
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ближайшие тренировки</h1>
      {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
      {events.length === 0 && <Card className="text-center text-slate-500">Пока ничего не запланировано</Card>}
      {events.map((e) => (
        <Card key={e.id} className={`space-y-3 ${isOpen(e) && !done.has(e.id) ? 'ring-2 ring-brand/60' : ''}`}>
          <div>
            <p className="text-lg font-bold">{e.title}</p>
            <p className="text-slate-600">{fmtDate(e.date)}, {fmtTime(e.start_time)}–{fmtTime(e.end_time)}</p>
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
      ))}
    </div>
  )
}
