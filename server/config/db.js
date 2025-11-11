import mongoose from 'mongoose'
import { config } from './env.js'

export async function connectDB() {
  mongoose.set('strictQuery', true)
  if (!config.mongoUri) {
    const msg = 'Missing MONGODB_URI. Set it to a reachable MongoDB connection string (e.g., MongoDB Atlas).'
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    } else {
      console.warn(`[dev] ${msg} Falling back to local if configured.`)
    }
  }
  await mongoose.connect(config.mongoUri)
  console.log('MongoDB connected')
}
