import { useCallback, useState } from 'react'

/** Одноразовый запрос позиции: const { locate, loading } = useGeolocation(); const pos = await locate() */
export function useGeolocation() {
  const [loading, setLoading] = useState(false)
  const locate = useCallback(
    () =>
      new Promise<GeolocationCoordinates>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Геолокация недоступна в этом браузере'))
        setLoading(true)
        navigator.geolocation.getCurrentPosition(
          (p) => { setLoading(false); resolve(p.coords) },
          (e) => {
            setLoading(false)
            reject(new Error(e.code === 1 ? 'Разрешите доступ к геолокации в настройках' : 'Не удалось определить местоположение'))
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        )
      }),
    [],
  )
  return { locate, loading }
}
