'use client'

import { useEffect, useRef } from 'react'
import { nextReconnectDelay, websocketUrl } from '@/lib/realtime.mjs'

export function useRealtimeChannel({ path, token, enabled = true, onEvent }) {
  const callback = useRef(onEvent)
  useEffect(() => { callback.current = onEvent }, [onEvent])
  useEffect(() => {
    if (!enabled || !token || !path) return undefined
    let socket; let retry; let closed = false; let attempt = 0
    const connect = () => {
      socket = new WebSocket(websocketUrl(path), ['bearer', token])
      socket.onopen = () => { attempt = 0 }
      socket.onmessage = event => { try { callback.current?.(JSON.parse(event.data)) } catch {} }
      socket.onclose = () => {
        if (!closed) retry = setTimeout(connect, nextReconnectDelay(attempt++))
      }
      socket.onerror = () => socket.close()
    }
    connect()
    return () => { closed = true; clearTimeout(retry); socket?.close() }
  }, [enabled, path, token])
}
