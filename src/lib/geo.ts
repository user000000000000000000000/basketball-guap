import { CHECKIN_BEFORE_MIN } from './config'
import type { EventRow } from './types'

/** Расстояние между точками в метрах (haversine) */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

const at = (e: EventRow, time: string) => new Date(`${e.date}T${time.slice(0, 5)}:00`)

/** Можно ли отмечаться: от (старт − 30 мин) до конца мероприятия */
export function isOpen(e: EventRow, now = new Date()) {
  return now >= new Date(at(e, e.start_time).getTime() - CHECKIN_BEFORE_MIN * 60000) && now <= at(e, e.end_time)
}
