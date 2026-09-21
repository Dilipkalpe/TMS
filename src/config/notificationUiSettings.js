/**
 * Centralized UI notification (toast) display duration.
 * Key: NotificationDisplayDurationSeconds — default 3.
 *
 * Priority: explicit toast({ duration }) override → stored setting → default 3.
 * Persistence: localStorage (no DB migration required).
 */

export const NOTIFICATION_DISPLAY_DURATION_SECONDS_KEY = 'NotificationDisplayDurationSeconds'
export const NOTIFICATION_DISPLAY_DURATION_STORAGE_KEY = 'tms-notification-display-duration-seconds'
export const DEFAULT_NOTIFICATION_DISPLAY_DURATION_SECONDS = 3

/** Allowed values for the Settings UI (seconds). */
export const NOTIFICATION_DISPLAY_DURATION_OPTIONS = [1, 2, 3, 5, 10]

const CHANGE_EVENT = 'tms-notification-duration-changed'

/**
 * @param {unknown} value
 * @returns {number|null} Positive integer seconds, or null if invalid.
 */
export function parseNotificationDisplayDurationSeconds(value) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(120, Math.max(1, Math.round(n)))
}

/**
 * @returns {number} Duration in seconds (always >= 1).
 */
export function getNotificationDisplayDurationSeconds() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_DISPLAY_DURATION_STORAGE_KEY)
    const parsed = parseNotificationDisplayDurationSeconds(raw)
    if (parsed != null) return parsed
  } catch {
    /* private mode / SSR */
  }
  return DEFAULT_NOTIFICATION_DISPLAY_DURATION_SECONDS
}

/**
 * @returns {number} Duration in milliseconds for setTimeout.
 */
export function getNotificationDisplayDurationMs() {
  return getNotificationDisplayDurationSeconds() * 1000
}

/**
 * Persist duration (seconds). Returns the normalized value that was stored.
 * @param {unknown} seconds
 * @returns {number}
 */
export function setNotificationDisplayDurationSeconds(seconds) {
  const parsed = parseNotificationDisplayDurationSeconds(seconds)
  if (parsed == null) {
    throw new Error('Notification display duration must be a positive number of seconds.')
  }
  try {
    localStorage.setItem(NOTIFICATION_DISPLAY_DURATION_STORAGE_KEY, String(parsed))
  } catch {
    /* ignore quota */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { seconds: parsed } }))
  } catch {
    /* ignore */
  }
  return parsed
}

/**
 * Subscribe to duration changes (same tab + storage from other tabs).
 * @param {(seconds: number) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeNotificationDisplayDuration(listener) {
  const onCustom = (e) => {
    const s = e?.detail?.seconds ?? getNotificationDisplayDurationSeconds()
    listener(s)
  }
  const onStorage = (e) => {
    if (e.key !== NOTIFICATION_DISPLAY_DURATION_STORAGE_KEY) return
    listener(getNotificationDisplayDurationSeconds())
  }
  window.addEventListener(CHANGE_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}
