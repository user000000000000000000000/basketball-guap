import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`glass p-5 ${className}`}>
    {children}
  </motion.div>
)

export const Logo = ({ size = 'text-2xl' }: { size?: string }) => (
  <div className={`flex items-center gap-2 font-extrabold ${size}`}>
    {/* чёрный силуэт спортсмена, трассировка логотипа */}
    <svg viewBox="285 235 330 410" height="1.5em" fill="#000">
      <circle cx="561" cy="281" r="35" />
      <path d="M329 327C400 306 480 297 520 306C548 316 545 350 520 390C490 440 400 560 298 628C380 545 440 470 462 385C470 350 458 328 329 327Z" />
      <path d="M487 467C515 465 535 470 528 487C510 520 430 580 367 613C430 565 475 520 487 467Z" />
    </svg>
    <span className="text-[#1c3f94]">Баскетбол ГУАП</span>
  </div>
)

export const Msg = ({ kind, children }: { kind: 'ok' | 'err'; children: ReactNode }) => (
  <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${kind === 'ok' ? 'bg-emerald-100/80 text-emerald-800' : 'bg-rose-100/80 text-rose-800'}`}>{children}</p>
)

export const Spinner = () => <div className="mx-auto my-10 size-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />

export const fmtTime = (t: string) => t.slice(0, 5)
export const fmtDate = (d: string) => {
  const days = Math.round((new Date(d + 'T00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 864e5)
  const text = new Date(d + 'T00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
  return days === 0 ? `Сегодня, ${text}` : days === 1 ? `Завтра, ${text}` : text
}
