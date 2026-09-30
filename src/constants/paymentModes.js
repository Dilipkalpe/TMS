/** Shared payment mode options (no DB master — keep lists consistent across forms). */
export const PAYMENT_MODES = [
  'Cash',
  'UPI',
  'NEFT',
  'RTGS',
  'Cheque',
  'Bank Transfer',
  'Card',
  'Credit',
  'FASTag',
]

export const PAYMENT_MODE_OPTIONS = PAYMENT_MODES.map((m) => ({ value: m, label: m }))

export const DEFAULT_PAYMENT_MODE = 'Cash'
