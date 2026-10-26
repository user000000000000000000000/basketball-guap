const env = import.meta.env
export const SUPABASE_URL = env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY as string | undefined
// Зал по умолчанию — Варшавская 8, СПб (поменяйте в .env)
export const GYM = {
  lat: Number(env.VITE_GYM_LAT || 59.8631),
  lng: Number(env.VITE_GYM_LNG || 30.3142),
  radiusM: Number(env.VITE_GYM_RADIUS_M || 100),
}
// Ключ Яндекс Геокодера (бесплатно, developer.tech.yandex.ru). Без него адрес ищется через OpenStreetMap — он хуже находит дома.
export const YANDEX_KEY = (env.VITE_YANDEX_GEOCODER_KEY as string | undefined) || ''
export const CHECKIN_BEFORE_MIN = 30 // отметка открывается за 30 минут до начала
// Тренировки секции: день недели (1 = пн … 6 = сб, 0 = вс). Остальное в зале (футбол, бадминтон, волейбол) — не наша секция.
export const WEEKLY = [
  { dow: 1, start: '20:00', end: '21:00', title: 'Баскетбол' },
  { dow: 1, start: '21:00', end: '22:00', title: 'Баскетбол' },
  { dow: 3, start: '20:00', end: '21:00', title: 'Баскетбол' },
  { dow: 3, start: '21:00', end: '22:00', title: 'Баскетбол' },
]
