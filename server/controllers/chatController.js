import { Chat } from '../models/Chat.js'
import { User } from '../models/User.js'
import { Message } from '../models/Message.js'

export async function listMyChats(req, res, next) {
  try {
    const chats = await Chat.find({ participants: req.userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username fullName avatarUrl isOnline createdAt')

    // Attach lastMessage per chat
    const result = []
    for (const chat of chats) {
      const last = await Message.findOne({ chat: chat._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'username fullName avatarUrl')
        .lean()
      const mapped = chat.toObject()
      if (last) {
        mapped.lastMessage = {
          _id: last._id,
          content: last.content,
          createdAt: last.createdAt,
          sender: last.sender ? {
            _id: last.sender._id,
            username: last.sender.username,
            fullName: last.sender.fullName,
            avatarUrl: last.sender.avatarUrl,
          } : null,
        }
      }
      result.push(mapped)
    }
    res.json({ chats: result })
  } catch (e) { next(e) }
}

export async function deleteChat(req, res, next) {
  try {
    const { chatId } = req.params
    const chat = await Chat.findById(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat not found' })
    const isParticipant = chat.participants.some((p) => String(p) === String(req.userId))
    if (chat.isGroup) {
      // Only creator can delete a group
      if (String(chat.createdBy) !== String(req.userId)) return res.status(403).json({ error: 'Only group creator can delete this group' })
    } else {
      if (!isParticipant) return res.status(403).json({ error: 'Not allowed' })
    }
    await Message.deleteMany({ chat: chatId })
    await Chat.findByIdAndDelete(chatId)
    res.json({ ok: true })
  } catch (e) { next(e) }
}

export async function getChatDetails(req, res, next) {
  try {
    const { chatId } = req.params
    const chat = await Chat.findById(chatId).populate('participants', 'username fullName avatarUrl isOnline')
    if (!chat) return res.status(404).json({ error: 'Chat not found' })
    res.json({ chat })
  } catch (e) { next(e) }
}

export async function createDirectChat(req, res, next) {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })
    const exists = await Chat.findOne({ isGroup: false, participants: { $all: [req.userId, userId], $size: 2 } })
    if (exists) return res.json({ chat: exists })
    const me = await User.findById(req.userId)
    const other = await User.findById(userId)
    if (!me || !other) return res.status(404).json({ error: 'User not found' })
    const chat = await Chat.create({ isGroup: false, createdBy: req.userId, participants: [req.userId, userId] })
    res.status(201).json({ chat })
  } catch (e) { next(e) }
}

// GROUP CHAT CONTROLLERS
export async function createGroupChat(req, res, next) {
  try {
    const { name, avatarUrl = '', memberIds } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group name required' })
    }
    if (!Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'memberIds must be an array' })
    }
    // Ensure creator is included; enforce 2..6 members not counting creator? We consider total participants including creator between 2 and 6.
    const uniqueIds = Array.from(new Set([...memberIds.map(String), String(req.userId)]))
    if (uniqueIds.length < 2 || uniqueIds.length > 6) {
      return res.status(400).json({ error: 'Group must have between 2 and 6 members (including creator)' })
    }
    // Validate users exist
    const users = await User.find({ _id: { $in: uniqueIds } }).select('_id')
    if (users.length !== uniqueIds.length) {
      return res.status(400).json({ error: 'One or more users not found' })
    }
    const chat = await Chat.create({
      isGroup: true,
      name: name.trim(),
      avatarUrl,
      participants: uniqueIds,
      createdBy: req.userId
    })
    res.status(201).json({ chat })
  } catch (e) { next(e) }
}

export async function renameGroup(req, res, next) {
  try {
    const { chatId } = req.params
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' })
    const chat = await Chat.findById(chatId)
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' })
    if (String(chat.createdBy) !== String(req.userId)) return res.status(403).json({ error: 'Only creator can manage the group' })
    chat.name = name.trim()
    await chat.save()
    res.json({ chat })
  } catch (e) { next(e) }
}

export async function updateGroupAvatar(req, res, next) {
  try {
    const { chatId } = req.params
    const { avatarUrl = '' } = req.body
    const chat = await Chat.findById(chatId)
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' })
    if (String(chat.createdBy) !== String(req.userId)) return res.status(403).json({ error: 'Only creator can manage the group' })
    chat.avatarUrl = avatarUrl
    await chat.save()
    res.json({ chat })
  } catch (e) { next(e) }
}

export async function addGroupMembers(req, res, next) {
  try {
    const { chatId } = req.params
    const { memberIds } = req.body
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'memberIds required' })
    }
    const chat = await Chat.findById(chatId)
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' })
    if (String(chat.createdBy) !== String(req.userId)) return res.status(403).json({ error: 'Only creator can manage the group' })
    const current = chat.participants.map((id) => String(id))
    const toAdd = memberIds.map(String).filter((id) => !current.includes(id))
    if (toAdd.length === 0) return res.json({ chat })
    const users = await User.find({ _id: { $in: toAdd } }).select('_id')
    if (users.length !== toAdd.length) return res.status(400).json({ error: 'One or more users not found' })
    const combined = Array.from(new Set([...current, ...toAdd]))
    if (combined.length > 6) return res.status(400).json({ error: 'Group cannot exceed 6 members' })
    chat.participants = combined
    await chat.save()
    res.json({ chat })
  } catch (e) { next(e) }
}

export async function removeGroupMember(req, res, next) {
  try {
    const { chatId, userId } = req.params
    const chat = await Chat.findById(chatId)
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' })
    if (String(chat.createdBy) !== String(req.userId)) return res.status(403).json({ error: 'Only creator can manage the group' })
    if (String(chat.createdBy) === String(userId)) return res.status(400).json({ error: 'Cannot remove the group creator' })
    const filtered = chat.participants.filter((id) => String(id) !== String(userId))
    if (filtered.length < 2) return res.status(400).json({ error: 'Group must have at least 2 members' })
    chat.participants = filtered
    await chat.save()
    res.json({ chat })
  } catch (e) { next(e) }
}
