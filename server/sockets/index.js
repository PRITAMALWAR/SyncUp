import { Server } from 'socket.io'
import { config } from '../config/env.js'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigins, credentials: true }
  })

  io.on('connection', (socket) => {
    const token = socket.handshake?.auth?.token || ''
    try {
      if (token) {
        const payload = jwt.verify(token, config.jwtSecret)
        socket.userId = payload.id
      }
    } catch (_) {
      // invalid token; proceed without presence
    }

    if (socket.userId) {
      // join personal room for direct user-targeted events (e.g., notifications)
      try { socket.join(`user:${socket.userId}`) } catch (_) {}
      User.findByIdAndUpdate(socket.userId, { isOnline: true }).catch(() => {})
      io.emit('presence:update', { userId: socket.userId, isOnline: true })
    }

    socket.on('join', ({ chatId }) => {
      if (chatId) socket.join(`chat:${chatId}`)
    })
    socket.on('leave', ({ chatId }) => {
      if (chatId) socket.leave(`chat:${chatId}`)
    })

    // typing indicators
    socket.on('typing', ({ chatId }) => {
      if (!chatId) return
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId: socket.userId })
    })
    socket.on('typing:stop', ({ chatId }) => {
      if (!chatId) return
      socket.to(`chat:${chatId}`).emit('typing:stop', { chatId, userId: socket.userId })
    })

    // profile updates (e.g., avatar)
    socket.on('user:update', async ({ avatarUrl }) => {
      try {
        if (!socket.userId) return
        if (avatarUrl) {
          await User.findByIdAndUpdate(socket.userId, { avatarUrl })
        }
        io.emit('user:update', { userId: socket.userId, avatarUrl })
      } catch (_) {
        // ignore errors
      }
    })

    socket.on('disconnect', () => {
      if (socket.userId) {
        User.findByIdAndUpdate(socket.userId, { isOnline: false }).catch(() => {})
        io.emit('presence:update', { userId: socket.userId, isOnline: false })
      }
    })
  })

  return io
}
