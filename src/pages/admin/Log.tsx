import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { FileDown, FileSpreadsheet, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { AttendanceFull, EventRow, Profile } from '../../lib/types'
import { Card, fmtTime, Msg } from '../../components/ui'

const slot = (e: EventRow) => `${fmtTime(e.start_time).replace(':', '.')}-${fmtTime(e.end_time).replace(':', '.')}` // «19.00-20.00»
const ymd =(d: Date) => format(d, 'yyyy-MM-dd')

export default function Log() {
  const [from, setFrom] = useState(ymd(startOfMonth(new Date())))
  const [to, setTo] = useState(ymd(endOfMonth(new Date())))
  const [rows, setRows] = useState<AttendanceFull[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [add, setAdd] = useState({ event_id: '', user_id: '' })
  const [err, setErr] = useState('')
  const report = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const [ev, at] = await Promise.all([
      supabase.from('events').select('*').gte('date', from).lte('date', to).order('date').order('start_time'),
      supabase.from('attendance').select('*, events!inner(*), profiles(full_name, group)').gte('events.date', from).lte('events.date', to).order('created_at'),
    ])
    setEvents((ev.data ?? []) as EventRow[])
    setRows((at.data ?? []) as unknown as AttendanceFull[])
  }, [from, to])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'student').neq('full_name', '').order('full_name').then(({ data }) => setStudents((data ?? []) as Profile[]))
  }, [])

  // агрегация: мероприятие → количество участников
  const summary = events.map((e) => ({ e, n: rows.filter((r) => r.event_id === e.id).length }))
  const total = rows.length

  const addManual = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = events.find((x) => x.id === add.event_id)
    if (!e) return
    // задним числом: время отметки = начало мероприятия
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map((r) => ({ ФИО: r.profiles.full_name, Группа: r.profiles.group, Мероприятие: `${r.events.title} ${r.events.date}`, 'Время отметки': format(new Date(r.created_at), 'dd.MM.yyyy HH:mm') }))), 'Детализация')
    XLSX.writeFile(wb, `attendance_${from}_${to}.xlsx`)
  }

  const exportPdf = async () => {
    const html2pdf = (await import('html2pdf.js')).default
    // рендер из DOM (canvas), поэтому кириллица работает без встраивания шрифтов
    html2pdf().set({ margin: 10, filename: `attendance_${from}_${to}.pdf`, jsPDF: { unit: 'mm', format: 'a4' } }).from(report.current!).save()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Журнал посещений</h1>
      <Card className="grid grid-cols-2 gap-3">
        <input className="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="btn-ghost" onClick={exportXlsx}><FileSpreadsheet size={18} /> Excel</button>
        <button className="btn-ghost" onClick={exportPdf}><FileDown size={18} /> PDF</button>
      </Card>

      <Card>
        <form onSubmit={addManual} className="space-y-3">
          <p className="font-bold">Отметить вручную</p>
          <select className="field" required value={add.event_id} onChange={(e) => setAdd({ ...add, event_id: e.target.value })}>
            <option value="">Мероприятие…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.date} {fmtTime(e.start_time)} {e.title}</option>)}
          </select>
          <select className="field" required value={add.user_id} onChange={(e) => setAdd({ ...add, user_id: e.target.value })}>
            <option value="">Студент…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.group})</option>)}
          </select>
          {err && <Msg kind="err">{err}</Msg>}
          <button className="btn w-full">Отметить</button>
        </form>
      </Card>

      <Card className="overflow-x-auto !p-3">
        <div ref={report} className="min-w-[520px] bg-white p-3 text-sm text-[#0f172a]"> {/* hex, не oklch: html2canvas не парсит oklch из палитры Tailwind v4 */}
          <h2 className="mb-1 text-base font-bold">Баскетбол ГУАП — посещаемость {from} … {to}</h2>
          <p className="mb-3">Всего отметок: <b>{total}</b></p>
          <table className="mb-4 w-full text-left">
            <thead><tr className="border-b font-semibold"><th className="py-1">Дата</th><th>Время</th><th>Мероприятие</th><th>Участников</th></tr></thead>
            <tbody>{summary.map(({ e, n }) => <tr key={e.id} className="border-b"><td className="py-1">{e.date}</td><td>{slot(e)}</td><td>{e.title}</td><td>{n}</td></tr>)}</tbody>
          </table>
          <table className="w-full text-left">
            <thead><tr className="border-b font-semibold"><th className="py-1">ФИО</th><th>Группа</th><th>Мероприятие</th><th>Отметка</th><th data-html2canvas-ignore /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-1">{r.profiles.full_name}</td><td>{r.profiles.group}</td>
                  <td>{r.events.title} {r.events.date}</td><td>{format(new Date(r.created_at), 'dd.MM HH:mm')}</td>
                  <td data-html2canvas-ignore><button aria-label="Удалить" className="p-2 text-[#e11d48]" onClick={() => del(r.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
