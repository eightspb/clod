import { useState, useCallback } from 'react'

/**
 * Hook for admin panel API calls with unified loading/error state
 * and automatic 401→login redirect.
 *
 * @returns {{ data, loading, error, fetchData, reset }}
 */
export function useAdminFetch() {
  const [data, setData] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fetchData = useCallback(async (url, { errorMessage = 'Не удалось загрузить данные' } = {}) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login'
          return undefined
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
      return json
    } catch {
      setError(errorMessage)
      return undefined
    } finally {
      setLoading(false)
    }
  }, [])
  function reset() {
    setData(undefined)
    setLoading(true)
    setError('')
  }
  return { data, loading, error, fetchData, reset }
}
