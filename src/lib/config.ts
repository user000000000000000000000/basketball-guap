const env = import.meta.env
export const SUPABASE_URL = env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY as string | undefined
// Зал по умолчанию — ГУАП, Большая Морская 67 (поменяйте в .env)
export const GYM = {
  lat: Number(env.VITE_GYM_LAT ?? 59.9558),
  lng: Number(env.VITE_GYM_LNG ?? 30.2871),
  radiusM: Number(env.VITE_GYM_RADIUS_M ?? 100),
}
export const CHECKIN_BEFORE_MIN = 30 // отметка открывается за 30 минут до начала
// Тренировки секции: день недели (1 = пн … 6 = сб, 0 = вс). Остальное в зале (футбол, бадминтон, волейбол) — не наша секция.
export const WEEKLY = [
  { dow: 1, start: '20:00', end: '21:00', title: 'Баскетбол' },
  { dow: 1, start: '21:00', end: '22:00', title: 'Баскетбол' },
  { dow: 3, start: '20:00', end: '21:00', title: 'Баскетбол' },
  { dow: 3, start: '21:00', end: '22:00', title: 'Баскетбол' },
]
