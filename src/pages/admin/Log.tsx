import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { FileDown, FileSpreadsheet, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSections } from '../../hooks/useSections'
import type { AttendanceFull, EventRow, Profile } from '../../lib/types'
import { Card, fmtDate, fmtTime, Msg, PickerField } from '../../components/ui'

const slot = (e: EventRow) => `${fmtTime(e.start_time).replace(':', '.')}-${fmtTime(e.end_time).replace(':', '.')}` // «19.00-20.00»
const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

export default function Log() {
  const { current } = useSections()
  const [from, setFrom] = useState(ymd(startOfMonth(new Date())))
  const [to, setTo] = useState(ymd(endOfMonth(new Date())))
  const [rows, setRows] = useState<AttendanceFull[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [add, setAdd] = useState({ event_id: '', user_id: '' })
  const [err, setErr] = useState('')
  const report = useRef<HTMLDivElement>(null)
  const secId = current?.id

  const load = useCallback(async () => {
    if (!secId) return
    const [ev, at] = await Promise.all([
      supabase.from('events').select('*').eq('section_id', secId).gte('date', from).lte('date', to).order('date').order('start_time'),
      supabase.from('attendance').select('*, events!inner(*), profiles(full_name, group)').eq('events.section_id', secId).gte('events.date', from).lte('events.date', to).order('created_at'),
    ])
    setEvents((ev.data ?? []) as EventRow[])
    setRows((at.data ?? []) as unknown as AttendanceFull[])
  }, [secId, from, to])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!secId) return
    supabase.from('section_members').select('profiles(*)').eq('section_id', secId).then(({ data }) => {
      const list = (data ?? []).map((r) => r.profiles as unknown as Profile).filter((p) => p?.full_name)
      setStudents(list.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru')))
    })
  }, [secId])

  if (!current) return <Card className="text-center text-slate-500">Вам пока не назначена ни одна секция</Card>

  // агрегация: занятие → количество участников
  const summary = events.map((e) => ({ e, n: rows.filter((r) => r.event_id === e.id).length }))
  const total = rows.length
  const byEvent = [...summary].reverse() // свежие сверху
  const rowsOf = (id: string) => rows.filter((r) => r.event_id === id)

  const addManual = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = events.find((x) => x.id === add.event_id)
    if (!e) return
    // задним числом: время отметки = начало занятия
    const created_at = new Date(`${e.date}T${fmtTime(e.start_time)}:00`).toISOString()
    const { error } = await supabase.from('attendance').insert({ ...add, created_at, status: 'present' })
    setErr(error ? (error.code === '23505' ? 'Студент уже отмечен' : error.message) : '')
    if (!error) load()
  }

  const del = async (id: string) => {
    if (!confirm('Удалить отметку?')) return
    await supabase.from('attendance').delete().eq('id', id)
    load()
  }

  const fname = `${current.name}_${from}_${to}`

  const exportXlsx = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    // формат как в образце «Отчет Баскетбол Сентябрь2026.xlsx»: листы «Соревнования» и «Тренировки»
    const comp = XLSX.utils.aoa_to_sheet([['Сборная', 'Название соревнований', 'Дата', 'Место проведения', 'Количество студентов в заявке', 'Результат', 'Ссылка на пост в соц сети или сайт']])
    comp['!cols'] = [23, 30, 14, 24, 30, 18, 36].map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(wb, comp, 'Соревнования')
    const tr = XLSX.utils.json_to_sheet(summary.map(({ e, n }) => ({ Дата: new Date(e.date + 'T00:00'), Время: slot(e), 'Количество участников': n })), { dateNF: 'dd.mm.yy', cellDates: true })
    tr['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 24 }]
    XLSX.utils.book_append_sheet(wb, tr, 'Тренировки')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map((r) => ({ ФИО: r.profiles.full_name, Группа: r.profiles.group, Занятие: `${r.events.title} ${r.events.date}`, 'Время отметки': format(new Date(r.created_at), 'dd.MM.yyyy HH:mm') }))), 'Детализация')
    XLSX.writeFile(wb, `attendance_${fname}.xlsx`)
  }

  const exportPdf = async () => {
    const html2pdf = (await import('html2pdf.js')).default
    // рендер из DOM (canvas), поэтому кириллица работает без встраивания шрифтов
    html2pdf().set({ margin: 10, filename: `attendance_${fname}.pdf`, jsPDF: { unit: 'mm', format: 'a4' } }).from(report.current!).save()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Журнал посещений</h1>
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0 text-xs text-slate-500">С<PickerField type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="min-w-0 text-xs text-slate-500">По<PickerField type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={exportXlsx}><FileSpreadsheet size={18} /> Excel</button>
          <button className="btn-ghost" onClick={exportPdf}><FileDown size={18} /> PDF</button>
        </div>
        <p className="text-center text-sm text-slate-600">Занятий: <b>{events.length}</b> · отметок: <b>{total}</b></p>
      </Card>

      {byEvent.length === 0 && <Card className="text-center text-slate-500">За этот период занятий нет</Card>}
      {byEvent.map(({ e, n }) => (
        <Card key={e.id} className="space-y-2 !p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">{e.title}</p>
              <p className="text-sm text-slate-600">{fmtDate(e.date)} · {fmtTime(e.start_time)}–{fmtTime(e.end_time)}</p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/80 text-xl font-extrabold text-brand shadow">{n}</span>
          </div>
          {rowsOf(e.id).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/60 py-1 pl-3 pr-1">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.profiles.full_name}</p>
                <p className="text-xs text-slate-500">{r.profiles.group} · {format(new Date(r.created_at), 'HH:mm')}</p>
              </div>
              <button aria-label="Удалить отметку" className="grid size-11 shrink-0 place-items-center text-rose-600" onClick={() => del(r.id)}><Trash2 size={18} /></button>
            </div>
          ))}
          {n === 0 && <p className="text-sm text-slate-400">Никто не отметился</p>}
        </Card>
      ))}

      <Card>
        <details>
          <summary className="cursor-pointer py-2 font-bold">Отметить студента вручную</summary>
          <form onSubmit={addManual} className="mt-3 space-y-3">
            <select className="field" required value={add.event_id} onChange={(e) => setAdd({ ...add, event_id: e.target.value })}>
              <option value="">Занятие…</option>
              {events.map((e) => <option key={e.id} value={e.id}>{fmtDate(e.date)} {fmtTime(e.start_time)}</option>)}
            </select>
            <select className="field" required value={add.user_id} onChange={(e) => setAdd({ ...add, user_id: e.target.value })}>
              <option value="">Студент секции…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.group})</option>)}
            </select>
            {err && <Msg kind="err">{err}</Msg>}
            <button className="btn w-full">Отметить</button>
          </form>
        </details>
      </Card>

      {/* отчёт для PDF: за экраном, но в DOM (html2canvas), hex-цвета — он не понимает oklch из Tailwind v4 */}
      <div style={{ position: 'absolute', left: -9999, top: 0 }} aria-hidden>
        <div ref={report} className="w-[720px] bg-white p-4 text-sm text-[#0f172a]">
          <h2 className="mb-1 text-base font-bold">ССК ГУАП — {current.name}: посещаемость {from} … {to}</h2>
          <p className="mb-3">Всего отметок: <b>{total}</b></p>
          <table className="mb-4 w-full text-left">
            <thead><tr className="border-b font-semibold"><th className="py-1">Дата</th><th>Время</th><th>Занятие</th><th>Участников</th></tr></thead>
            <tbody>{summary.map(({ e, n }) => <tr key={e.id} className="border-b"><td className="py-1">{e.date}</td><td>{slot(e)}</td><td>{e.title}</td><td>{n}</td></tr>)}</tbody>
          </table>
          <table className="w-full text-left">
            <thead><tr className="border-b font-semibold"><th className="py-1">ФИО</th><th>Группа</th><th>Занятие</th><th>Отметка</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-1">{r.profiles.full_name}</td><td>{r.profiles.group}</td>
                  <td>{r.events.title} {r.events.date}</td><td>{format(new Date(r.created_at), 'dd.MM HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
