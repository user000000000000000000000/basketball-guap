import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addDays, format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { GYM, WEEKLY } from '../../lib/config'
import type { EventRow } from '../../lib/types'
import { Card, fmtDate, fmtTime, Msg } from '../../components/ui'

const empty = () => ({ title: 'Тренировка', date: format(new Date(), 'yyyy-MM-dd'), start_time: '18:00', end_time: '19:30', lat: String(GYM.lat), lng: String(GYM.lng) })

export default function Events() {
  const [list, setList] = useState<EventRow[]>([])
  const [f, setF] = useState(empty())
  const [editId, setEditId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: false }).order('start_time')
    setList((data ?? []) as EventRow[])
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const row = { ...f, lat: Number(f.lat), lng: Number(f.lng) }
    const q = editId ? supabase.from('events').update(row).eq('id', editId) : supabase.from('events').insert(row)
    const { error } = await q
    if (error) return setErr(error.message)
    setErr(''); setEditId(null); setF(empty()); load()
  }

  // создаёт тренировки по недельному расписанию на 4 недели вперёд, уже существующие пропускает
  const fillWeeks = async () => {
    const days = Array.from({ length: 28 }, (_, i) => addDays(new Date(), i))
    const rows = days.flatMap((d) => WEEKLY.filter((w) => w.dow === d.getDay()).map((w) => ({ title: w.title, date: format(d, 'yyyy-MM-dd'), start_time: w.start, end_time: w.end, lat: GYM.lat, lng: GYM.lng })))
    const have = new Set(list.map((e) => e.date + fmtTime(e.start_time) + e.title))
    const fresh = rows.filter((r) => !have.has(r.date + r.start_time + r.title))
    if (!fresh.length) return setErr('Все тренировки на 4 недели уже созданы')
    const { error } = await supabase.from('events').insert(fresh)
    setErr(error ? error.message : '')
    load()
  }

  const edit = (e: EventRow) => {
    setEditId(e.id)
    setF({ title: e.title, date: e.date, start_time: fmtTime(e.start_time), end_time: fmtTime(e.end_time), lat: String(e.lat ?? GYM.lat), lng: String(e.lng ?? GYM.lng) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const del = async (e: EventRow) => {
    if (!confirm(`Удалить «${e.title}» и все отметки на нём?`)) return
    await supabase.from('events').delete().eq('id', e.id)
    load()
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Расписание</h1>
      <button className="btn-ghost w-full" onClick={fillWeeks}>Создать тренировки по расписанию (пн, ср · два часовых блока 20–22) на 4 недели</button>
      <Card>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <input className="field col-span-2" required placeholder="Название" value={f.title} onChange={set('title')} />
          <input className="field col-span-2" required type="date" value={f.date} onChange={set('date')} />
          <label className="text-xs text-slate-500">Начало<input className="field mt-1" required type="time" value={f.start_time} onChange={set('start_time')} /></label>
          <label className="text-xs text-slate-500">Конец<input className="field mt-1" required type="time" value={f.end_time} onChange={set('end_time')} /></label>
          <label className="text-xs text-slate-500">Широта<input className="field mt-1" required type="number" step="any" value={f.lat} onChange={set('lat')} /></label>
          <label className="text-xs text-slate-500">Долгота<input className="field mt-1" required type="number" step="any" value={f.lng} onChange={set('lng')} /></label>
          {err && <div className="col-span-2"><Msg kind="err">{err}</Msg></div>}
          <button className="btn col-span-2">{editId ? 'Сохранить' : 'Добавить'}</button>
          {editId && <button type="button" className="btn-ghost col-span-2" onClick={() => { setEditId(null); setF(empty()) }}>Отмена</button>}
        </form>
      </Card>
      {list.map((e) => (
        <Card key={e.id} className="flex items-center justify-between gap-3 !p-4">
          <div>
            <p className="font-bold">{e.title}</p>
            <p className="text-sm text-slate-600">{fmtDate(e.date)}, {fmtTime(e.start_time)}–{fmtTime(e.end_time)}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost !px-3" aria-label="Изменить" onClick={() => edit(e)}><Pencil size={18} /></button>
            <button className="btn-ghost !px-3 !text-rose-600" aria-label="Удалить" onClick={() => del(e)}><Trash2 size={18} /></button>
          </div>
        </Card>
      ))}
    </div>
  )
}
