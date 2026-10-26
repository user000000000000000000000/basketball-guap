import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addDays, format } from 'date-fns'
import { MapPin, Pencil, Search, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { GYM, WEEKLY } from '../../lib/config'
import { geocode, type Place } from '../../lib/geo'
import type { EventRow } from '../../lib/types'
import { Card, fmtDate, fmtTime, Msg, PickerField } from '../../components/ui'

const today = () => format(new Date(), 'yyyy-MM-dd')
const empty = (g: { lat: number; lng: number }) => ({ title: 'Баскетбол', date: today(), start_time: '20:00', end_time: '21:00', lat: g.lat, lng: g.lng })

export default function Events() {
  const [list, setList] = useState<EventRow[]>([])
  const [gym, setGym] = useState({ lat: GYM.lat, lng: GYM.lng }) // координаты зала: у последней тренировки, иначе из .env
  const [f, setF] = useState(empty(gym))
  const [editId, setEditId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [past, setPast] = useState(false)
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [found, setFound] = useState<Place | null>(null)
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    let q = supabase.from('events').select('*').order('date').order('start_time')
    if (!past) q = q.gte('date', today())
    const { data } = await q
    setList((data ?? []) as EventRow[])
  }, [past])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    supabase.from('events').select('lat,lng').not('lat', 'is', null).order('date', { ascending: false }).limit(1).then(({ data }) => {
      if (data?.[0]) {
        const g = { lat: data[0].lat as number, lng: data[0].lng as number }
        setGym(g)
        setF((x) => ({ ...x, ...g }))
      }
    })
  }, [])

  const search = async (e: FormEvent) => {
    e.preventDefault()
    setErr(''); setFound(null); setSearching(true)
    try {
      const p = await geocode(address)
      if (!p) setErr('Адрес не найден. Уточните: город, улица, дом')
      setFound(p)
    } catch (x) { setErr((x as Error).message) }
    setSearching(false)
  }

  // найденные координаты → зал: обновляем все будущие тренировки и значения по умолчанию
  const applyPlace = async () => {
    if (!found) return
    const g = { lat: found.lat, lng: found.lng }
    const { error } = await supabase.from('events').update(g).gte('date', today())
    if (error) return setErr(error.message)
    setGym(g); setF((x) => ({ ...x, ...g })); setFound(null); setErr(''); load()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const q = editId ? supabase.from('events').update(f).eq('id', editId) : supabase.from('events').insert(f)
    const { error } = await q
    if (error) return setErr(error.message)
    setErr(''); setEditId(null); setOpen(false); setF(empty(gym)); load()
  }

  // создаёт тренировки по недельному расписанию на 4 недели вперёд, уже существующие пропускает
  const fillWeeks = async () => {
    const days = Array.from({ length: 28 }, (_, i) => addDays(new Date(), i))
    const rows = days.flatMap((d) => WEEKLY.filter((w) => w.dow === d.getDay()).map((w) => ({ title: w.title, date: format(d, 'yyyy-MM-dd'), start_time: w.start, end_time: w.end, ...gym })))
    const have = new Set(list.map((e) => e.date + fmtTime(e.start_time) + e.title))
    const fresh = rows.filter((r) => !have.has(r.date + r.start_time + r.title))
    if (!fresh.length) return setErr('Все тренировки на 4 недели уже созданы')
    const { error } = await supabase.from('events').insert(fresh)
    setErr(error ? error.message : '')
    load()
  }

  const edit = (e: EventRow) => {
    setEditId(e.id)
    setOpen(true)
    setF({ title: e.title, date: e.date, start_time: fmtTime(e.start_time), end_time: fmtTime(e.end_time), lat: e.lat ?? gym.lat, lng: e.lng ?? gym.lng })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const del = async (e: EventRow) => {
    if (!confirm(`Удалить «${e.title}» и все отметки на нём?`)) return
    await supabase.from('events').delete().eq('id', e.id)
    load()
  }

  const set = (k: 'title' | 'date' | 'start_time' | 'end_time') => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Расписание</h1>

      <Card className="space-y-3">
        <p className="font-bold">Где проходят тренировки</p>
        <form onSubmit={search} className="flex gap-2">
          <input className="field min-w-0 flex-1" required placeholder="Санкт-Петербург, Варшавская улица, 8" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button className="btn !px-4" disabled={searching} aria-label="Найти"><Search size={20} /></button>
        </form>
        {found && (
          <div className="space-y-2 rounded-2xl bg-white/70 p-3 text-sm">
            <p className="flex gap-2"><MapPin size={18} className="mt-0.5 shrink-0 text-brand" /><span>{found.name}</span></p>
            {!found.exact && <Msg kind="err">Дом точно не найден — координаты приблизительные. Добавьте город и номер дома или вставьте координаты «59.8631, 30.3142».</Msg>}
            <button className="btn w-full" onClick={applyPlace}>Да, это зал — применить</button>
          </div>
        )}
        <p className="text-xs text-slate-500">Сейчас: {gym.lat.toFixed(5)}, {gym.lng.toFixed(5)} · радиус отметки {GYM.radiusM} м</p>
      </Card>

      <Card className="space-y-3">
        <button className="btn w-full flex-col !h-auto !gap-0 !py-3 text-center leading-snug" onClick={fillWeeks}>
          Создать тренировки на 4 недели
          <span className="block text-xs font-normal opacity-90">пн и ср · 20:00–21:00 и 21:00–22:00</span>
        </button>
        {err && <Msg kind="err">{err}</Msg>}
        <button className="btn-ghost w-full" onClick={() => setOpen(!open)}>{open ? 'Скрыть форму' : editId ? 'Редактирование' : 'Добавить одну тренировку'}</button>
        {open && (
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <input className="field col-span-2" required placeholder="Название" value={f.title} onChange={set('title')} />
            <label className="col-span-2 min-w-0 text-xs text-slate-500">Дата<PickerField type="date" value={f.date} onChange={set('date')} /></label>
            <label className="min-w-0 text-xs text-slate-500">Начало<PickerField type="time" value={f.start_time} onChange={set('start_time')} /></label>
            <label className="min-w-0 text-xs text-slate-500">Конец<PickerField type="time" value={f.end_time} onChange={set('end_time')} /></label>
            <button className="btn col-span-2">{editId ? 'Сохранить' : 'Добавить'}</button>
            {editId && <button type="button" className="btn-ghost col-span-2" onClick={() => { setEditId(null); setOpen(false); setF(empty(gym)) }}>Отмена</button>}
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
