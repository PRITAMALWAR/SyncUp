import { Message } from '../models/Message.js'
import { Chat } from '../models/Chat.js'

export async function listMessages(req, res, next) {
  try {
    const { chatId } = req.params
    const msgs = await Message.find({ chat: chatId, hiddenFor: { $ne: req.userId } })
      .sort({ createdAt: 1 })
      .populate('sender', 'username fullName avatarUrl')
      .lean()
    res.json({ messages: msgs })
  } catch (e) { next(e) }
}

export async function clearAllGroupMessagesForUser(req, res, next) {
  try {
    // Find all group chats the user participates in
    const groups = await Chat.find({ participants: req.userId, isGroup: true }).select('_id').lean()
    const groupIds = groups.map((c) => c._id)
    if (groupIds.length > 0) {
      await Message.deleteMany({ chat: { $in: groupIds } })
    }
    res.json({ ok: true, clearedGroups: groupIds.length })
  } catch (e) { next(e) }
}

export async function sendMessage(req, res, next) {
  try {
    const { chatId } = req.params
    const { content, attachments } = req.body
    if (!content && !(attachments && attachments.length)) return res.status(400).json({ error: 'content required' })
    const msg = await Message.create({ chat: chatId, sender: req.userId, content: content || '', attachments: attachments || [] })
    const populated = await Message.findById(msg._id).populate('sender', 'username fullName avatarUrl')
    await Chat.findByIdAndUpdate(chatId, { $set: { lastMessageAt: new Date() } })
    const io = req.app.get('io')
    const payload = {
      id: populated._id,
      chat: chatId,
      sender: populated.sender,
      content: populated.content,
      attachments: populated.attachments || [],
      createdAt: populated.createdAt,
    }
    // Emit to chat room (participants who joined the chat socket room)
    io.to(`chat:${chatId}`).emit('message:new', payload)
    // Also emit to each participant's personal room to guarantee delivery
    try {
      const chat = await Chat.findById(chatId).select('participants').lean()
      const recipients = (chat?.participants || []).map((p) => String(p)).filter((id) => id !== String(req.userId))
      for (const uid of recipients) {
        io.to(`user:${uid}`).emit('message:new', payload)
      }
    } catch (_) {}
    res.status(201).json({ message: populated })
  } catch (e) { next(e) }
}

export async function markRead(req, res, next) {
  try {
    const { chatId } = req.params
    const userId = req.userId
    // mark all messages in chat as seen by this user (excluding their own)
    await Message.updateMany({ chat: chatId, sender: { $ne: userId }, seenBy: { $ne: userId } }, { $addToSet: { seenBy: userId } })
    const io = req.app.get('io')
    io.to(`chat:${chatId}`).emit('message:read', { chat: chatId, userId })
    res.json({ ok: true })
  } catch (e) { next(e) }
}

export async function clearChatMessages(req, res, next) {
  try {
    const { chatId } = req.params
    const chat = await Chat.findById(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat not found' })
    const isParticipant = chat.participants.some((p) => String(p) === String(req.userId))
    if (!isParticipant) return res.status(403).json({ error: 'Not allowed' })
    // For group chats, only the creator can clear all messages
    if (chat.isGroup) {
      const isCreator = String(chat.createdBy) === String(req.userId)
      if (!isCreator) return res.status(403).json({ error: 'Only the group creator can clear messages' })
    }
    await Message.deleteMany({ chat: chatId })
    const io = req.app.get('io')
    if (io) io.to(`chat:${chatId}`).emit('chat:cleared', { chat: chatId })
    res.json({ ok: true })
  } catch (e) { next(e) }
}

export async function clearAllMessagesForUser(req, res, next) {
  try {
    const chats = await Chat.find({ participants: req.userId }).select('_id').lean()
    const chatIds = chats.map((c) => c._id)
    if (chatIds.length > 0) {
      await Message.deleteMany({ chat: { $in: chatIds } })
    }
    res.json({ ok: true, clearedChats: chatIds.length })
  } catch (e) { next(e) }
}

export async function clearChatForMe(req, res, next) {
  try {
    const { chatId } = req.params
    const chat = await Chat.findById(chatId).select('participants')
    if (!chat) return res.status(404).json({ error: 'Chat not found' })
    const isParticipant = (chat.participants || []).some((p) => String(p) === String(req.userId))
    if (!isParticipant) return res.status(403).json({ error: 'Not allowed' })
    await Message.updateMany(
      { chat: chatId, hiddenFor: { $ne: req.userId } },
      { $addToSet: { hiddenFor: req.userId } }
    )
    return res.json({ ok: true })
  } catch (e) { next(e) }
}

export async function deleteMessage(req, res, next) {
  try {
    const { messageId } = req.params
    const msg = await Message.findById(messageId)
    if (!msg) return res.status(404).json({ error: 'Message not found' })
    const chat = await Chat.findById(msg.chat).select('isGroup createdBy')
    const io = req.app.get('io')
    if (chat?.isGroup) {
      // Allow only group admin (creator) to delete; perform soft delete with placeholder
      if (String(chat.createdBy) !== String(req.userId)) {
        return res.status(403).json({ error: 'Only group admin can delete messages' })
      }
      await Message.findByIdAndUpdate(messageId, { $set: { isDeleted: true, deletedByAdmin: true, deletedBy: req.userId, content: '', attachments: [], reactions: [] } })
      if (io && msg.chat) {
        io.to(`chat:${msg.chat}`).emit('message:deleted', { id: messageId, chat: msg.chat, deletedByAdmin: true, deletedBy: req.userId })
      }
      return res.json({ ok: true, softDeleted: true })
    }
    // Direct chat: only sender can delete; soft delete and record who deleted
    if (String(msg.sender) !== String(req.userId)) {
      return res.status(403).json({ error: 'Not allowed' })
    }
    await Message.findByIdAndUpdate(messageId, { $set: { isDeleted: true, deletedBy: req.userId, content: '', attachments: [], reactions: [] } })
    if (io && msg.chat) {
      io.to(`chat:${msg.chat}`).emit('message:deleted', { id: messageId, chat: msg.chat, deletedBy: req.userId })
    }
    return res.json({ ok: true, softDeleted: true })
  } catch (e) { next(e) }
}

