import { CHECKIN_BEFORE_MIN, YANDEX_KEY } from './config'
import type { EventRow } from './types'

/** Расстояние между точками в метрах (haversine) */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

export interface Place { lat: number; lng: number; name: string; exact: boolean }

/** Адрес (или «59.86, 30.31», или ссылка с координатами) → координаты. Яндекс при наличии ключа, иначе OpenStreetMap. */
export async function geocode(query: string): Promise<Place | null> {
  const q = query.trim()
  const pair = q.match(/(-?\d{1,3}[.,]\d{3,})\s*[,; ]\s*(-?\d{1,3}[.,]\d{3,})/)
  if (pair) return { lat: parseFloat(pair[1].replace(',', '.')), lng: parseFloat(pair[2].replace(',', '.')), name: 'Координаты из ввода', exact: true }
  if (YANDEX_KEY) {
    try {
      const r = await fetch(`https://geocode-maps.yandex.ru/v1/?apikey=${YANDEX_KEY}&format=json&results=1&lang=ru_RU&geocode=${encodeURIComponent(q)}`)
      if (r.ok) {
        const g = (await r.json()).response.GeoObjectCollection.featureMember[0]?.GeoObject
        if (!g) return null
        const [lng, lat] = g.Point.pos.split(' ').map(Number)
        return { lat, lng, name: g.metaDataProperty.GeocoderMetaData.text, exact: g.metaDataProperty.GeocoderMetaData.precision === 'exact' }
      }
    } catch { /* ключ не принят или нет сети — ниже запасной поиск через OpenStreetMap */ }
  }
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru&countrycodes=ru&q=${encodeURIComponent(q)}`)
  const j = (await r.json())[0]
  return j ? { lat: +j.lat, lng: +j.lon, name: j.display_name, exact: j.class === 'building' || j.addresstype === 'building' } : null
}

const at = (e: EventRow, time: string) => new Date(`${e.date}T${time.slice(0, 5)}:00`)

/** Можно ли отмечаться: от (старт − 30 мин) до конца мероприятия */
export function isOpen(e: EventRow, now = new Date()) {
  return now >= new Date(at(e, e.start_time).getTime() - CHECKIN_BEFORE_MIN * 60000) && now <= at(e, e.end_time)
}
