import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DEFAULT_NOTIFICATION_DISPLAY_DURATION_SECONDS,
  NOTIFICATION_DISPLAY_DURATION_STORAGE_KEY,
  getNotificationDisplayDurationSeconds,
  getNotificationDisplayDurationMs,
  parseNotificationDisplayDurationSeconds,
  setNotificationDisplayDurationSeconds,
} from './notificationUiSettings'

describe('notificationUiSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to 3 seconds', () => {
    expect(getNotificationDisplayDurationSeconds()).toBe(DEFAULT_NOTIFICATION_DISPLAY_DURATION_SECONDS)
    expect(getNotificationDisplayDurationMs()).toBe(3000)
  })

  it('parses and rejects invalid values', () => {
    expect(parseNotificationDisplayDurationSeconds(3)).toBe(3)
    expect(parseNotificationDisplayDurationSeconds('5')).toBe(5)
    expect(parseNotificationDisplayDurationSeconds(0)).toBeNull()
    expect(parseNotificationDisplayDurationSeconds(-1)).toBeNull()
    expect(parseNotificationDisplayDurationSeconds('abc')).toBeNull()
  })

  it('persists and reads duration from storage', () => {
    expect(setNotificationDisplayDurationSeconds(5)).toBe(5)
    expect(localStorage.getItem(NOTIFICATION_DISPLAY_DURATION_STORAGE_KEY)).toBe('5')
    expect(getNotificationDisplayDurationSeconds()).toBe(5)
    expect(getNotificationDisplayDurationMs()).toBe(5000)
  })

  it('throws on invalid set', () => {
    expect(() => setNotificationDisplayDurationSeconds(0)).toThrow(/positive/i)
  })

  it('dispatches change event on set', () => {
    const spy = vi.fn()
    window.addEventListener('tms-notification-duration-changed', spy)
    setNotificationDisplayDurationSeconds(2)
    expect(spy).toHaveBeenCalled()
    window.removeEventListener('tms-notification-duration-changed', spy)
  })
})
