import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'

import { connectDB } from './config/db.js'
import { config } from './config/env.js'
import { initSockets } from './sockets/index.js'
import { errorHandler } from './middleware/error.js'

import authRoutes from './routes/authRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import messageRoutes from './routes/messageRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import userRoutes from './routes/userRoutes.js'

const app = express()
const server = http.createServer(app)
const io = initSockets(server)
app.set('io', io)

app.use(cors({
  credentials: true,
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (config.clientOrigins?.includes(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  }
}))
// Ensure preflight requests receive CORS headers
app.options('*', cors({
  credentials: true,
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (config.clientOrigins?.includes(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  }
}))
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }))

// static uploads
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use('/uploads', express.static(path.join(__dirname, config.uploadDir)))

// routes
app.use('/api/auth', authRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/users', userRoutes)

app.get('/', (req, res) => res.json({ ok: true, name: 'SyncUp Server' }))

app.use(errorHandler)

const start = async () => {
  await connectDB()
  server.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`)
  })
}

start()
