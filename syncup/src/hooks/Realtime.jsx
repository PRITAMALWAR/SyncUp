import { useEffect } from 'react'
import { subscribeMessages } from '../lib/data'
import { useAuth } from '../contexts/AuthContext'

// Listen for new messages in a specific chat
export function useRealtimeMessages(chatId, onNewMessage) {
  const { user } = useAuth()

  useEffect(() => {
    if (!chatId || !user) return

    const unsubscribe = subscribeMessages(chatId, (msg) => onNewMessage(msg))
    return () => unsubscribe()
  }, [chatId, user, onNewMessage])
}

// Track online user presence
export function useRealtimePresence() {
  // No-op presence for local data service; could be implemented if needed
  useEffect(() => {}, [])
}
