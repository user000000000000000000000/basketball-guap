import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addDays, format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { GYM, WEEKLY } from '../../lib/config'
import type { EventRow } from '../../lib/types'
import { useGeolocation } from '../../hooks/useGeolocation'
import { Card, fmtDate, fmtTime, Msg } from '../../components/ui'

const empty = () => ({ title: 'Баскетбол', date: format(new Date(), 'yyyy-MM-dd'), start_time: '20:00', end_time: '21:00', lat: String(GYM.lat), lng: String(GYM.lng) })

export default function Events() {
  const [list, setList] = useState<EventRow[]>([])
  const [f, setF] = useState(empty())
  const [editId, setEditId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const { locate, loading: locating } = useGeolocation()
  const [info, setInfo] = useState('')
  const [past, setPast] = useState(false)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    let q = supabase.from('events').select('*').order('date').order('start_time')
    if (!past) q = q.gte('date', format(new Date(), 'yyyy-MM-dd'))
    const { data } = await q
    setList((data ?? []) as EventRow[])
  }, [past])
  useEffect(() => { load() }, [load])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const row = { ...f, lat: Number(f.lat), lng: Number(f.lng) }
    const q = editId ? supabase.from('events').update(row).eq('id', editId) : supabase.from('events').insert(row)
    const { error } = await q
    if (error) return setErr(error.message)
    setErr(''); setEditId(null); setOpen(false); setF(empty()); load()
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

  // «Я в зале»: текущая позиция телефона становится координатами всех будущих тренировок
  const calibrate = async () => {
    setErr(''); setInfo('')
    try {
      const p = await locate()
      const { error } = await supabase.from('events').update({ lat: p.latitude, lng: p.longitude }).gte('date', format(new Date(), 'yyyy-MM-dd'))
      if (error) throw new Error(error.message)
      setF((x) => ({ ...x, lat: String(p.latitude), lng: String(p.longitude) }))
      setInfo(`Готово: ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)} (точность ±${Math.round(p.accuracy)} м). Впишите их в VITE_GYM_LAT/LNG, чтобы новые тренировки создавались с ними.`)
      load()
    } catch (e) { setErr((e as Error).message) }
  }

  const edit = (e: EventRow) => {
    setEditId(e.id)
    setOpen(true)
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
      <Card className="space-y-3">
        <button className="btn w-full !h-auto !py-3 text-center leading-snug" onClick={fillWeeks}>
          Создать тренировки на 4 недели
          <span className="block text-xs font-normal opacity-90">пн и ср · 20:00–21:00 и 21:00–22:00</span>
        </button>
        <button className="btn-ghost w-full" disabled={locating} onClick={calibrate}>{locating ? 'Определяем…' : '📍 Я в зале: взять мои координаты'}</button>
        {info && <Msg kind="ok">{info}</Msg>}
        {err && <Msg kind="err">{err}</Msg>}
        <button className="btn-ghost w-full" onClick={() => setOpen(!open)}>{open ? 'Скрыть форму' : editId ? 'Редактирование' : 'Добавить одну тренировку'}</button>
        {open && (
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <input className="field col-span-2" required placeholder="Название" value={f.title} onChange={set('title')} />
            <label className="col-span-2 min-w-0 text-xs text-slate-500">Дата<input className="field mt-1" required type="date" value={f.date} onChange={set('date')} /></label>
            <label className="min-w-0 text-xs text-slate-500">Начало<input className="field mt-1" required type="time" value={f.start_time} onChange={set('start_time')} /></label>
            <label className="min-w-0 text-xs text-slate-500">Конец<input className="field mt-1" required type="time" value={f.end_time} onChange={set('end_time')} /></label>
            <label className="min-w-0 text-xs text-slate-500">Широта<input className="field mt-1" required type="number" step="any" value={f.lat} onChange={set('lat')} /></label>
            <label className="min-w-0 text-xs text-slate-500">Долгота<input className="field mt-1" required type="number" step="any" value={f.lng} onChange={set('lng')} /></label>
            <button className="btn col-span-2">{editId ? 'Сохранить' : 'Добавить'}</button>
            {editId && <button type="button" className="btn-ghost col-span-2" onClick={() => { setEditId(null); setOpen(false); setF(empty()) }}>Отмена</button>}
          </form>
        )}
      </Card>
      {list.length === 0 && <Card className="text-center text-slate-500">Тренировок нет — нажмите «Создать тренировки на 4 недели»</Card>}
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
      <button className="btn-ghost w-full" onClick={() => setPast(!past)}>{past ? 'Скрыть прошедшие' : 'Показать прошедшие'}</button>
    </div>
  )
}
