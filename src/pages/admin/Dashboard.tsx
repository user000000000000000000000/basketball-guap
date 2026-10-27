import { useEffect, useState } from 'react'
import { eachDayOfInterval, format, subDays } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useSections } from '../../hooks/useSections'
import { Card, Spinner } from '../../components/ui'

export default function Dashboard() {
  const { current } = useSections()
  const [days, setDays] = useState<{ day: string; n: number }[] | null>(null)

  useEffect(() => {
    if (!current) return
    setDays(null)
    const from = subDays(new Date(), 29)
    supabase
      .from('attendance')
      .select('created_at, events!inner(section_id)')
      .eq('events.section_id', current.id)
      .gte('created_at', from.toISOString())
      .then(({ data }) => {
        const count: Record<string, number> = {}
        data?.forEach((a) => { const k = format(new Date(a.created_at), 'yyyy-MM-dd'); count[k] = (count[k] ?? 0) + 1 })
        setDays(eachDayOfInterval({ start: from, end: new Date() }).map((d) => ({ day: format(d, 'yyyy-MM-dd'), n: count[format(d, 'yyyy-MM-dd')] ?? 0 })))
      })
  }, [current])

  if (!current) return <Card className="text-center text-slate-500">Вам пока не назначена ни одна секция</Card>
  if (!days) return <Spinner />
  const max = Math.max(1, ...days.map((d) => d.n))
  const total = days.reduce((s, d) => s + d.n, 0)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Посещаемость за 30 дней</h1>
      <div className="grid grid-cols-2 gap-3">
        <Card><p className="text-sm text-slate-500">Всего отметок</p><p className="grad-text text-4xl font-extrabold">{total}</p></Card>
        <Card><p className="text-sm text-slate-500">В день в среднем</p><p className="grad-text text-4xl font-extrabold">{(total / 30).toFixed(1)}</p></Card>
      </div>
      <Card>
        <div className="flex h-48 items-end gap-[3px]">
          {days.map((d) => (
            <div key={d.day} title={`${format(new Date(d.day), 'dd.MM')}: ${d.n}`} className="flex-1 rounded-t-md" style={{ height: `${Math.max(2, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.2, background: `linear-gradient(to top, ${current.color}, #d81b60)` }} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{format(new Date(days[0].day), 'dd.MM')}</span><span>{format(new Date(days[29].day), 'dd.MM')}</span>
        </div>
      </Card>
    </div>
  )
}
