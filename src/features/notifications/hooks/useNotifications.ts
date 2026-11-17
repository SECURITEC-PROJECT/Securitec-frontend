import { useCallback, useEffect, useState } from 'react'
import { fetchNotifications } from '../services/notifications'
import type { NotificationsData } from '../types'

const POLL_MS = 30_000
const EMPTY: NotificationsData = { unread: 0, escalateTo: null, notifications: [] }

/** Notifications de l'utilisateur, actualisées toutes les 30 s (et quand la fenêtre reprend le focus). */
export function useNotifications() {
  const [data, setData] = useState<NotificationsData>(EMPTY)

  const refresh = useCallback(async () => {
    try {
      setData(await fetchNotifications())
    } catch {
      // Réseau coupé ou session expirée : on garde la dernière liste, la prochaine actualisation réessaiera.
    }
  }, [])

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && void refresh()
    tick()
    const timer = window.setInterval(tick, POLL_MS)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', tick)
    }
  }, [refresh])

  return { ...data, refresh }
}
