import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import fs from 'fs'
import path from 'path'
import { config } from '../config/env.js'

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
})

// Use Cloudinary if credentials are provided, otherwise fallback to local storage
let storage

if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  // Use Cloudinary storage
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
      const isImage = file.mimetype && file.mimetype.startsWith('image/')
      const baseParams = {
        folder: 'syncup',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
      }
      // Apply transformations only to images
      if (isImage) {
        baseParams.transformation = [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }]
      }
      return baseParams
    },
  })
} else {
  // Fallback to local storage for development
  const dir = path.resolve(process.cwd(), config.uploadDir)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      const name = `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`
      cb(null, name)
    }
  })
}

export const upload = multer({ storage })
