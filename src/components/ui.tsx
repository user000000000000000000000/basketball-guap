import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Clock } from 'lucide-react'

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
    <span className="text-[#1c3f94]">ССК ГУАП</span>
  </div>
)

const EMOJI: Record<string, string> = {
  'Баскетбол': '🏀', 'Футбол': '⚽', 'Волейбол': '🏐', 'Бадминтон': '🏸', 'Плавание': '🏊', 'Шахматы': '♟️', 'Бильярд': '🎱',
  'Боулинг': '🎳', 'Дартс': '🎯', 'Гребной спорт': '🚣', 'Парусный спорт': '⛵', 'Автоспорт': '🏎️', 'Спортивный туризм': '🥾', 'Го': '⚫', 'Шашки': '⚪',
}

/** Цветной значок секции: эмодзи вида спорта, иначе инициалы (логотипов у секций нет) */
export const SectionBadge = ({ name, color, size = 44 }: { name: string; color: string; size?: number }) => (
  <span
    className="grid shrink-0 place-items-center rounded-2xl font-extrabold text-white shadow"
    style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontSize: size * (EMOJI[name] ? 0.5 : 0.38) }}
  >
    {EMOJI[name] ?? name.split(/[\s-]+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
  </span>
)

export const WEEKDAYS = [
  { dow: 1, short: 'пн', full: 'Понедельник' }, { dow: 2, short: 'вт', full: 'Вторник' }, { dow: 3, short: 'ср', full: 'Среда' },
  { dow: 4, short: 'чт', full: 'Четверг' }, { dow: 5, short: 'пт', full: 'Пятница' }, { dow: 6, short: 'сб', full: 'Суббота' }, { dow: 0, short: 'вс', full: 'Воскресенье' },
]

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

/** Дата/время: видимое значение рисуем сами (по центру), нативный инпут лежит поверх прозрачным и открывает системный пикер.
 *  Нативный date/time в iOS Safari не поддаётся выравниванию — отсюда обходной путь. */
export const PickerField = ({ type, value, onChange }: { type: 'date' | 'time'; value: string; onChange: (e: { target: { value: string } }) => void }) => (
  <div className="field relative mt-1 !flex items-center justify-between">
    <span>{value ? (type === 'date' ? value.split('-').reverse().join('.') : value) : '—'}</span>
    {type === 'date' ? <CalendarDays size={18} className="text-slate-500" /> : <Clock size={18} className="text-slate-500" />}
    <input type={type} required value={value} onChange={onChange} className="absolute inset-0 size-full cursor-pointer opacity-0" />
  </div>
)
