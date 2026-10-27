import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addDays, format } from 'date-fns'
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { GYM } from '../../lib/config'
import { geocode, type Place } from '../../lib/geo'
import { useSections } from '../../hooks/useSections'
import type { EventRow, ScheduleSlot } from '../../lib/types'
import { Card, fmtDate, fmtTime, Msg, PickerField, WEEKDAYS } from '../../components/ui'

const today = () => format(new Date(), 'yyyy-MM-dd')

export default function Events() {
  const { current, reload } = useSections()
  const [list, setList] = useState<EventRow[]>([])
  const [f, setF] = useState({ title: '', date: today(), start_time: '20:00', end_time: '21:00' })
  const [editId, setEditId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [past, setPast] = useState(false)
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [found, setFound] = useState<Place | null>(null)
  const [searching, setSearching] = useState(false)
  const [sched, setSched] = useState<ScheduleSlot[]>([])

  const secId = current?.id
  const gym = { lat: current?.lat ?? GYM.lat, lng: current?.lng ?? GYM.lng }

  const load = useCallback(async () => {
    if (!secId) return
    let q = supabase.from('events').select('*').eq('section_id', secId).order('date').order('start_time')
    if (!past) q = q.gte('date', today())
    const { data } = await q
    setList((data ?? []) as EventRow[])
  }, [secId, past])
  useEffect(() => { load() }, [load])
  useEffect(() => { setSched(current?.schedule ?? []); setFound(null); setErr(''); setInfo('') }, [current])

  if (!current) return <Card className="text-center text-slate-500">Вам пока не назначена ни одна секция</Card>

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

  // найденные координаты → зал секции: сохраняем в секции и обновляем будущие занятия
  const applyPlace = async () => {
    if (!found) return
    const g = { lat: found.lat, lng: found.lng }
    const a = await supabase.from('sections').update(g).eq('id', current.id)
    const b = await supabase.from('events').update(g).eq('section_id', current.id).gte('date', today())
    if (a.error || b.error) return setErr((a.error ?? b.error)!.message)
    setFound(null); setErr(''); setInfo('Зал обновлён'); await reload(); load()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const row = { ...f, title: f.title || current.name, section_id: current.id, ...gym }
    const q = editId ? supabase.from('events').update(row).eq('id', editId) : supabase.from('events').insert(row)
    const { error } = await q
    if (error) return setErr(error.message)
    setErr(''); setEditId(null); setOpen(false); load()
  }

  // создаёт занятия по недельному расписанию секции на 4 недели вперёд, уже существующие пропускает
  const fillWeeks = async () => {
    setInfo('')
    if (!current.schedule.length) return setErr('Сначала задайте недельное расписание секции (ниже)')
    const days = Array.from({ length: 28 }, (_, i) => addDays(new Date(), i))
    const rows = days.flatMap((d) => current.schedule.filter((w) => w.dow === d.getDay()).map((w) => ({ section_id: current.id, title: current.name, date: format(d, 'yyyy-MM-dd'), start_time: w.start, end_time: w.end, ...gym })))
    const have = new Set(list.map((e) => e.date + fmtTime(e.start_time)))
    const fresh = rows.filter((r) => !have.has(r.date + r.start_time))
    if (!fresh.length) return setErr('Все занятия на 4 недели уже созданы')
    const { error } = await supabase.from('events').insert(fresh)
    setErr(error ? error.message : '')
    if (!error) setInfo(`Создано занятий: ${fresh.length}`)
    load()
  }

  const saveSchedule = async () => {
    const { error } = await supabase.from('sections').update({ schedule: sched }).eq('id', current.id)
    setErr(error ? error.message : '')
    if (!error) { setInfo('Расписание секции сохранено'); await reload() }
  }
  const setSlot = (i: number, patch: Partial<ScheduleSlot>) => setSched(sched.map((s, k) => (k === i ? { ...s, ...patch } : s)))

  const edit = (e: EventRow) => {
    setEditId(e.id)
    setOpen(true)
    setF({ title: e.title, date: e.date, start_time: fmtTime(e.start_time), end_time: fmtTime(e.end_time) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const del = async (e: EventRow) => {
    if (!confirm(`Удалить занятие ${fmtDate(e.date)} и все отметки на нём?`)) return
    await supabase.from('events').delete().eq('id', e.id)
    load()
  }

  const set = (k: 'title' | 'date' | 'start_time' | 'end_time') => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Расписание</h1>

      <Card className="space-y-3">
        <p className="font-bold">Где проходят занятия</p>
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
        <p className="font-bold">Недельное расписание секции</p>
        {sched.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <select className="field" value={s.dow} onChange={(e) => setSlot(i, { dow: Number(e.target.value) })} aria-label="День">
              {WEEKDAYS.map((d) => <option key={d.dow} value={d.dow}>{d.short}</option>)}
            </select>
            <PickerField type="time" value={s.start} onChange={(e) => setSlot(i, { start: e.target.value })} />
            <PickerField type="time" value={s.end} onChange={(e) => setSlot(i, { end: e.target.value })} />
            <button className="btn-ghost !px-3 !text-rose-600" aria-label="Убрать" onClick={() => setSched(sched.filter((_, k) => k !== i))}><Trash2 size={18} /></button>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={() => setSched([...sched, { dow: 1, start: '20:00', end: '21:00' }])}><Plus size={18} /> Слот</button>
          <button className="btn-ghost" onClick={saveSchedule}>Сохранить</button>
        </div>
      </Card>

      <Card className="space-y-3">
        <button className="btn w-full flex-col !h-auto !gap-0 !py-3 text-center leading-snug" onClick={fillWeeks}>
          Создать занятия на 4 недели
          <span className="block text-xs font-normal opacity-90">по недельному расписанию секции</span>
        </button>
        {info && <Msg kind="ok">{info}</Msg>}
        {err && <Msg kind="err">{err}</Msg>}
        <button className="btn-ghost w-full" onClick={() => setOpen(!open)}>{open ? 'Скрыть форму' : editId ? 'Редактирование' : 'Добавить одно занятие'}</button>
        {open && (
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <input className="field col-span-2" placeholder={`Название (по умолчанию «${current.name}»)`} value={f.title} onChange={set('title')} />
            <label className="col-span-2 min-w-0 text-xs text-slate-500">Дата<PickerField type="date" value={f.date} onChange={set('date')} /></label>
            <label className="min-w-0 text-xs text-slate-500">Начало<PickerField type="time" value={f.start_time} onChange={set('start_time')} /></label>
            <label className="min-w-0 text-xs text-slate-500">Конец<PickerField type="time" value={f.end_time} onChange={set('end_time')} /></label>
            <button className="btn col-span-2">{editId ? 'Сохранить' : 'Добавить'}</button>
            {editId && <button type="button" className="btn-ghost col-span-2" onClick={() => { setEditId(null); setOpen(false) }}>Отмена</button>}
          </form>
        )}
      </Card>
      {list.length === 0 && <Card className="text-center text-slate-500">Занятий нет — задайте расписание и нажмите «Создать занятия на 4 недели»</Card>}
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
