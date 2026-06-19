import { useCallback, useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value) => {
      setStored((prev) => {
        const next = typeof value === 'function' ? value(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* ignore quota errors */
        }
        return next
      })
    },
    [key],
  )

  return [stored, setValue]
}
