import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Card, Logo, Msg } from '../components/ui'

/** first = первый вход: экран без навигации, пока ФИО не заполнено */
export default function Profile({ first = false }: { first?: boolean }) {
  const { session, profile, refresh } = useAuth()
  const [f, setF] = useState({ full_name: profile?.full_name ?? '', group: profile?.group ?? '', phone: profile?.phone ?? '' })
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('profiles').update(f).eq('id', session!.user.id)
    setBusy(false)
    if (error) return setMsg({ kind: 'err', text: error.message })
    setMsg({ kind: 'ok', text: 'Сохранено' })
    await refresh()
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const body = (
    <Card>
      <form onSubmit={save} className="space-y-3">
        <h1 className="text-xl font-bold">{first ? 'Расскажите о себе' : 'Профиль'}</h1>
        <input className="field" required placeholder="ФИО" autoComplete="name" value={f.full_name} onChange={set('full_name')} />
        <input className="field" required placeholder="Группа (например, м550 или 4318)" value={f.group} onChange={set('group')} />
        <input className="field" required type="tel" placeholder="Телефон" autoComplete="tel" value={f.phone} onChange={set('phone')} />
        <input className="field opacity-60" disabled value={session?.user.email ?? ''} />
        {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
        <button className="btn w-full" disabled={busy}>Сохранить</button>
      </form>
    </Card>
  )
  if (!first) return body
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-5">
      <div className="flex justify-center"><Logo size="text-3xl" /></div>
      {body}
    </div>
  )
}
