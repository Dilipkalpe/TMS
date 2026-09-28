import { useCallback, useEffect, useRef, useState } from 'react'
import { driverPortalApi } from '../services/api'

const QUEUE_KEY = 'tms-driver-location-queue'
const MAX_QUEUE = 50
const STALE_MS = 90_000
const POOR_ACCURACY_M = 100

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)))
}

/**
 * Browser GPS via watchPosition — active only while the Driver Portal tab is open.
 * Does not claim background tracking after browser suspend/close.
 */
export function useDriverGeolocation({ sessionId, enabled, onError }) {
  const watchId = useRef(null)
  const lastSentAt = useRef(0)
  const [status, setStatus] = useState('idle') // idle | requesting | active | denied | unavailable | stale | offline
  const [lastFix, setLastFix] = useState(null)
  const [message, setMessage] = useState('')

  const flushQueue = useCallback(async () => {
    if (!sessionId || !navigator.onLine) return
    const queue = loadQueue().filter((q) => q.sessionId === sessionId)
    if (!queue.length) return
    const remaining = []
    for (const item of queue) {
      try {
        await driverPortalApi.submitLocation({
          sessionId: item.sessionId,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracy: item.accuracy,
          speed: item.speed,
          heading: item.heading,
          gpsTimestamp: item.gpsTimestamp,
        })
      } catch {
        remaining.push(item)
      }
    }
    const others = loadQueue().filter((q) => q.sessionId !== sessionId)
    saveQueue([...others, ...remaining])
  }, [sessionId])

  const sendFix = useCallback(async (coords, timestamp) => {
    if (!sessionId) return
    const payload = {
      sessionId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? null,
      speed: coords.speed != null && coords.speed >= 0 ? coords.speed : null,
      heading: coords.heading != null && coords.heading >= 0 ? coords.heading : null,
      gpsTimestamp: new Date(timestamp).toISOString(),
    }

    setLastFix({
      ...payload,
      receivedAt: Date.now(),
      poorAccuracy: payload.accuracy != null && payload.accuracy > POOR_ACCURACY_M,
    })

    if (!navigator.onLine) {
      const q = loadQueue()
      q.push(payload)
      saveQueue(q)
      setStatus('offline')
      setMessage('Offline — location queued. Will sync when connected.')
      return
    }

    try {
      await driverPortalApi.submitLocation(payload)
      lastSentAt.current = Date.now()
      setStatus('active')
      setMessage(payload.accuracy != null && payload.accuracy > POOR_ACCURACY_M
        ? 'Tracking active (weak GPS accuracy)'
        : 'Tracking active')
      await flushQueue()
    } catch (err) {
      const q = loadQueue()
      q.push(payload)
      saveQueue(q)
      setStatus('offline')
      setMessage(err.message || 'Network error — location queued')
      onError?.(err)
    }
  }, [sessionId, flushQueue, onError])

  const stop = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setStatus((s) => (s === 'denied' || s === 'unavailable' ? s : 'idle'))
  }, [])

  const start = useCallback(() => {
    if (!sessionId || !enabled) return
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      setStatus('unavailable')
      setMessage('HTTPS required for browser location')
      return
    }
    if (!navigator.geolocation) {
      setStatus('unavailable')
      setMessage('Geolocation not supported on this device')
      return
    }

    setStatus('requesting')
    setMessage('Requesting location permission…')

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendFix(pos.coords, pos.timestamp)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied')
          setMessage('Location permission denied. Enable location in browser settings.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('unavailable')
          setMessage('GPS unavailable. Check device location services.')
        } else {
          setStatus('unavailable')
          setMessage(err.message || 'Location error')
        }
        onError?.(err)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 20_000,
      },
    )
  }, [sessionId, enabled, sendFix, onError])

  useEffect(() => {
    if (enabled && sessionId) start()
    else stop()
    return () => stop()
  }, [enabled, sessionId, start, stop])

  // Detect stale fixes when tab is suspended / JS paused
  useEffect(() => {
    if (!enabled) return undefined
    const id = setInterval(() => {
      if (!lastFix?.receivedAt) return
      if (Date.now() - lastFix.receivedAt > STALE_MS) {
        setStatus('stale')
        setMessage('Location tracking temporarily unavailable')
      }
    }, 15_000)

    const onVisible = () => {
      if (document.visibilityState === 'visible' && enabled && sessionId) {
        if (status === 'stale' || status === 'idle') start()
        flushQueue()
      }
    }
    const onOnline = () => {
      flushQueue()
      if (enabled) setMessage('Back online — syncing locations')
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [enabled, sessionId, lastFix, status, start, flushQueue])

  return { status, message, lastFix, start, stop }
}
