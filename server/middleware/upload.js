import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { config } from '../config/env.js'

const dir = path.resolve(process.cwd(), config.uploadDir)
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`
    cb(null, name)
  }
})

export const upload = multer({ storage })
