import dotenv from 'dotenv'
dotenv.config({ override: true })

const parseOrigins = (val) => {
  if (!val) return ['http://localhost:5173']
  return val.split(',').map((s) => s.trim()).filter(Boolean)
}

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? '' : 'mongodb://127.0.0.1:27017/syncup'),
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGIN),
  uploadDir: process.env.UPLOAD_DIR || 'uploads'
}
