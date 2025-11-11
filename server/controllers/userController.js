import { User } from '../models/User.js'

export async function listUsers(req, res, next) {
  try {
    const q = (req.query.q || '').toLowerCase()
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('username fullName avatarUrl isOnline')
      .limit(100)
    const filtered = q
      ? users.filter(u => (u.username || '').toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q))
      : users
    res.json({ users: filtered })
  } catch (e) { next(e) }
}
