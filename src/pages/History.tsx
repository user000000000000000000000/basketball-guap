import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { AttendanceFull } from '../lib/types'
import { Card, fmtDate, fmtTime, SectionBadge, Spinner } from '../components/ui'

export default function History() {
  const { session } = useAuth()
  const [rows, setRows] = useState<AttendanceFull[] | null>(null)

  useEffect(() => {
    supabase
      .from('attendance')
      .select('*, events(*, sections(name, color))')
      .eq('user_id', session!.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows((data ?? []) as AttendanceFull[]))
  }, [session])

  if (!rows) return <Spinner />
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Мои посещения · {rows.length}</h1>
      {rows.length === 0 && <Card className="text-center text-slate-500">Посещений пока нет</Card>}
      {rows.map((r) => (
        <Card key={r.id} className="flex items-center gap-3 !p-4">
          {r.events.sections && <SectionBadge name={r.events.sections.name} color={r.events.sections.color} size={40} />}
          <div>
            <p className="font-bold">{r.events.sections?.name ?? r.events.title}</p>
            <p className="text-sm text-slate-600">
              {fmtDate(r.events.date)}, {fmtTime(r.events.start_time)} · отмечен {format(new Date(r.created_at), 'dd.MM HH:mm')}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}
