import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Logo, Msg } from '../components/ui'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const run = async (fn: () => Promise<{ error: Error | null }>, okText?: string) => {
    setBusy(true)
    setMsg(null)
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg({ kind: 'err', text: error.message })
    else if (okText) setMsg({ kind: 'ok', text: okText })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const creds = { email, password }
    if (mode === 'in') return run(async () => supabase.auth.signInWithPassword(creds))
    return run(async () => {
      const r = await supabase.auth.signUp(creds)
      // если в Supabase включено подтверждение почты — сессии нет, пишем об этом
      return { error: r.error ?? null }
    }, 'Готово. Если пришло письмо — подтвердите почту и войдите.')
  }

  const magic = () =>
    run(
      async () => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }),
      'Ссылка для входа отправлена на почту.',
    )

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-5">
      <div className="flex justify-center"><Logo size="text-3xl" /></div>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <h1 className="text-xl font-bold">{mode === 'in' ? 'Вход' : 'Регистрация'}</h1>
          <input className="field" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="field" type="password" required minLength={6} placeholder="Пароль (от 6 символов)" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
          <button className="btn w-full" disabled={busy}>{mode === 'in' ? 'Войти' : 'Создать аккаунт'}</button>
          <button type="button" className="btn-ghost w-full" disabled={busy || !email} onClick={magic}>Войти по ссылке из письма</button>
          <button type="button" className="w-full py-2 text-sm font-semibold text-brand" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
            {mode === 'in' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </form>
      </Card>
    </div>
  )
}
