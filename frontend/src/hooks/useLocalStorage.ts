import { useState, useEffect, useCallback } from 'react'

function readValue<T>(key: string, initialValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : initialValue
  } catch {
    return initialValue
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => readValue(key, initialValue))

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // quota exceeded or other error
        }
        return next
      })
    },
    [key]
  )

  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === key) {
        setStoredValue(readValue(key, initialValue))
      }
    }

    function handleCacheFlush() {
      setStoredValue(readValue(key, initialValue))
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth:cache-flush', handleCacheFlush)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth:cache-flush', handleCacheFlush)
    }
  }, [key, initialValue])

  return [storedValue, setValue]
}
