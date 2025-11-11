import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
let socket
let joinedRooms = new Set()

export function getSocket() {
  if (!socket) {
    socket = io(URL, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      auth: { token: typeof localStorage !== 'undefined' ? (localStorage.getItem('auth_token') || '') : '' },
    })
    socket.on('connect', () => console.log('[socket] connected', socket.id))
    socket.on('connect_error', (err) => console.warn('[socket] connect_error', err?.message))
    socket.on('error', (err) => console.warn('[socket] error', err))
  }
  return socket
}

export function refreshSocketAuth(token) {
  const s = getSocket()
  s.auth = { ...(s.auth || {}), token: token || '' }
  if (!s.connected) s.connect()
}

export function disconnectSocket() {
  if (socket) socket.disconnect()
}

export function joinChat(chatId) {
  const s = getSocket()
  const doJoin = () => {
    if (joinedRooms.has(chatId)) return
    s.emit('join', { chatId })
    joinedRooms.add(chatId)
  }
  if (s.connected) doJoin()
  else s.once('connect', doJoin)
}

export function leaveChat(chatId) {
  const s = getSocket()
  const doLeave = () => {
    s.emit('leave', { chatId })
    joinedRooms.delete(chatId)
  }
  if (s.connected) doLeave()
  else s.once('connect', doLeave)
}
