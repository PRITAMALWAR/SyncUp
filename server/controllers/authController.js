import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { config } from '../config/env.js'

export async function register(req, res, next) {
  try {
    const { email, password, username, fullName } = req.body
    if (!email || !password || !username) return res.status(400).json({ error: 'Missing fields' })
    const existing = await User.findOne({ $or: [{ email }, { username }] })
    if (existing) return res.status(409).json({ error: 'Email or username in use' })
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ email, passwordHash, username, fullName })
    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' })
    res.json({ token, user: toPublic(user) })
  } catch (e) { next(e) }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' })
    res.json({ token, user: toPublic(user) })
  } catch (e) { next(e) }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId)
    res.json({ user: toPublic(user) })
  } catch (e) { next(e) }
}

function toPublic(u) {
  return {
    id: u._id,
    email: u.email,
    username: u.username,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    bio: u.bio
  }
}
