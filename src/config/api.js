export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/** Router basename when hosted under a subpath. Empty for root (default dev server). */
export const APP_BASE_PATH = (import.meta.env.VITE_BASE_PATH || '').replace(/\/$/, '')
