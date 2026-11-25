'use client'

import { useEffect, useRef, useState } from 'react'

export function useAutoRefresh(callback, intervalMs, { enabled = true, blocked = false } = {}) {
  const callbackRef = useRef(callback)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  useEffect(() => { callbackRef.current = callback }, [callback])
  useEffect(() => {
    if (!enabled) return undefined
    const run = async () => { if (!blocked && !document.hidden) { await callbackRef.current(); setLastUpdatedAt(new Date()) } }
    const visibility = () => { if (!document.hidden) run() }
    const timer = setInterval(run, intervalMs)
    document.addEventListener('visibilitychange', visibility)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility) }
  }, [enabled, blocked, intervalMs])
  return { lastUpdatedAt, refresh: callback }
}
