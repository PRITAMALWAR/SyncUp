import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { getSocket, joinChat, leaveChat } from '../../lib/socket'
import { Send, Users, Paperclip, Mic, Trash2, Settings, EllipsisVertical } from 'lucide-react'
import ManageGroupModal from './ManageGroupModal'
import GroupInfoModal from './GroupInfoModal'
import PeopleInfoModal from './PeopleInfoModal'

export default function ChatWindow({ chatId }) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [chatInfo, setChatInfo] = useState(null)
  const [showManage, setShowManage] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearingForMe, setClearingForMe] = useState(false)
  const [clearError, setClearError] = useState('')
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [typingUsers, setTypingUsers] = useState(new Set())
  const typingTimeoutRef = useRef(null)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

  const normalizeUrl = (url) => {
    if (!url) return url
    if (url.startsWith('http')) return url
    if (url.startsWith('/')) return `${API_BASE}${url}`
    return url
  }

  const handleClearChat = async () => {
    // Open modal for options; permission checks will apply to the "everyone" action separately
    setShowConfirmClear(true)
  }

  const confirmClearChat = async () => {
    setClearing(true)
    setClearError('')
    try {
      await api.messages.clearChat(chatId)
      setMessages([])
      setShowConfirmClear(false)
    } catch (e) {
      console.error('Failed to clear chat', e)
      setClearError(e?.message || 'Failed to clear messages')
    } finally {
      setClearing(false)
    }
  }

  const clearChatForMe = async () => {
    setClearingForMe(true)
    setClearError('')
    try {
      await api.messages.clearForMe(chatId)
      setMessages([])
      setShowConfirmClear(false)
    } catch (e) {
      console.error('Failed to clear for me', e)
      setClearError(e?.message || 'Failed to clear messages for you')
    } finally {
      setClearingForMe(false)
    }
  }

  useEffect(() => {
    if (!chatId) return
    loadMessages()
    loadChatInfo()
    joinChat(chatId)
    const socket = getSocket()
    const handler = (payload) => {
      const payloadChatId = payload?.chat?._id || payload?.chat
      if (payloadChatId === chatId) {
        const incomingId = payload?._id || payload?.id
        setMessages((prev) => {
          if (incomingId && prev.some((m) => m.id === incomingId)) return prev
          const mapped = {
            id: incomingId || `${Date.now()}`,
            chat: payloadChatId,
            sender_id: payload?.sender?._id || payload?.sender?.id,
            sender: payload?.sender
              ? {
                  id: payload.sender._id || payload.sender.id,
                  username: payload.sender.username,
                  full_name: payload.sender.fullName,
                  avatar_url: payload.sender.avatarUrl,
                }
              : null,
            content: payload?.content,
            createdAt: payload?.createdAt || payload?.created_at || new Date().toISOString(),
            seenBy: payload?.seenBy || [],
            attachments: (payload?.attachments || []).map((a) => ({ ...a, url: normalizeUrl(a.url) })),
          }
          // If this is my message, try to reconcile an optimistic one to avoid duplicates
          const fromMe = (payload?.sender?._id === profile?.id) || (payload?.sender?.id === profile?.id)
          if (fromMe) {
            const idx = prev.findIndex((m) => m.optimistic && m.sender_id === profile?.id && (m.content || '') === (mapped.content || ''))
            if (idx !== -1) {
              const next = [...prev]
              next[idx] = { ...mapped, optimistic: false }
              return next
            }
          }
          return [...prev, mapped]
        })
        setTimeout(scrollToBottom, 50)
        // mark as read if message not from me
        if (payload?.sender?._id !== profile?.id && payload?.sender?.id !== profile?.id) {
          api.messages.markRead(chatId).catch(() => {})
        }
      }
    }
    const onRead = ({ chat, userId }) => {
      if ((chat?._id || chat) !== chatId) return
      // mark all my messages as seen by userId
      setMessages((prev) => prev.map((m) => {
        if (m.sender_id === profile?.id) {
          const seenSet = new Set(m.seenBy || [])
          seenSet.add(userId)
          return { ...m, seenBy: Array.from(seenSet) }
        }
        return m
      }))
    }
    const onTyping = ({ chatId: cId, userId }) => {
      if (cId !== chatId || userId === profile?.id) return
      setTypingUsers((prev) => new Set(prev).add(userId))
    }
    const onTypingStop = ({ chatId: cId, userId }) => {
      if (cId !== chatId || userId === profile?.id) return
      setTypingUsers((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
    socket.on('message:new', handler)
    socket.on('message:read', onRead)
    socket.on('typing', onTyping)
    socket.on('typing:stop', onTypingStop)
    const onPresence = ({ userId, isOnline }) => {
      setChatInfo((prev) => {
        if (!prev) return prev
        const updated = {
          ...prev,
          participants: (prev.participants || []).map((p) =>
            (p.id === userId || p._id === userId) ? { ...p, is_online: !!isOnline } : p
          ),
        }
        return updated
      })
    }
    const onDeleted = ({ id, chat, deletedByAdmin, deletedBy }) => {
      const cId = chat?._id || chat
      if (!cId || cId !== chatId) return
      // Soft delete for both group and direct; include who deleted
      setMessages((prev) => prev.map((m) => (
        m.id === id
          ? { ...m, isDeleted: true, deletedByAdmin: !!deletedByAdmin, deletedBy: deletedBy || m.deletedBy, content: '', attachments: [], reactions: [] }
          : m
      )))
    }
    const onUserUpdate = ({ userId, avatarUrl }) => {
      // update header participants
      setChatInfo((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          participants: (prev.participants || []).map((p) =>
            (p.id === userId || p._id === userId) ? { ...p, avatar_url: avatarUrl || p.avatar_url } : p
          ),
        }
      })
      // update existing messages' sender avatars
      setMessages((prev) => prev.map((m) =>
        (m.sender_id === userId)
          ? { ...m, sender: m.sender ? { ...m.sender, avatar_url: avatarUrl || m.sender.avatar_url } : m.sender }
          : m
      ))
    }
    socket.on('presence:update', onPresence)
    socket.on('message:deleted', onDeleted)
    socket.on('user:update', onUserUpdate)
    const onCleared = ({ chat }) => {
      const cId = chat?._id || chat
      if (!cId || cId !== chatId) return
      setMessages([])
    }
    socket.on('chat:cleared', onCleared)
    return () => {
      socket.off('message:new', handler)
      socket.off('message:read', onRead)
      socket.off('typing', onTyping)
      socket.off('typing:stop', onTypingStop)
      socket.off('presence:update', onPresence)
      socket.off('message:deleted', onDeleted)
      socket.off('user:update', onUserUpdate)
      socket.off('chat:cleared', onCleared)
      leaveChat(chatId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])

  // Realtime handled via Socket.io above

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChatInfo = async () => {
    try {
      const chat = await api.chats.get(chatId)
      if (chat) {
        const isGroup = !!chat.isGroup
        const participants = (chat.participants || []).map((p) => ({
          id: p._id || p.id,
          username: p.username,
          full_name: p.fullName,
          is_online: p.isOnline,
          avatar_url: p.avatarUrl,
        }))
        const otherUser = participants.find((p) => p.id !== profile?.id)
        setChatInfo({
          id: chat._id || chat.id,
          name: isGroup ? (chat.name || 'Group Chat') : (otherUser?.full_name || otherUser?.username || 'Unknown'),
          isGroup,
          group_avatar_url: chat.avatarUrl || '',
          created_by: chat.createdBy ? (chat.createdBy._id || chat.createdBy) : undefined,
          participants,
        })
      }
    } catch (error) {
      console.error('Error loading chat info:', error)
    }
  }

  const emitTyping = () => {
    const socket = getSocket()
    socket.emit('typing', { chatId })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { chatId })
    }, 1200)
  }

  const loadMessages = async () => {
    try {
      const data = await api.messages.list(chatId)
      const mapped = (data || []).map((m) => ({
        id: m._id || m.id,
        chat: m.chat?._id || m.chat || chatId,
        sender_id: m.sender?._id || m.sender?.id,
        sender: m.sender ? {
          id: m.sender._id || m.sender.id,
          username: m.sender.username,
          full_name: m.sender.fullName,
          avatar_url: m.sender.avatarUrl,
        } : null,
        content: m.content,
        createdAt: m.createdAt,
        seenBy: m.seenBy || [],
        attachments: (m.attachments || []).map((a) => ({ ...a, url: normalizeUrl(a.url) })),
        isDeleted: !!m.isDeleted,
        deletedByAdmin: !!m.deletedByAdmin,
        deletedBy: m.deletedBy || null,
      }))
      const uniq = []
      const seen = new Set()
      for (const m of mapped) {
        if (m.id && !seen.has(m.id)) { seen.add(m.id); uniq.push(m) }
      }
      setMessages(uniq)
      setTimeout(scrollToBottom, 100)
      // mark as read on load
      api.messages.markRead(chatId).catch(() => {})
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteMessageLocal = async (messageId) => {
    try {
      await api.messages.deleteOne(messageId)
      // If this is a group and I'm admin, server performs soft delete; reflect locally
      if (chatInfo?.isGroup && String(chatInfo?.created_by) === String(profile?.id)) {
        setMessages((prev) => prev.map((m) => (
          m.id === messageId ? { ...m, isDeleted: true, deletedByAdmin: true, deletedBy: profile?.id, content: '', attachments: [], reactions: [] } : m
        )))
      } else {
        // Direct chat delete (soft delete)
        setMessages((prev) => prev.map((m) => (
          m.id === messageId ? { ...m, isDeleted: true, deletedByAdmin: false, deletedBy: profile?.id, content: '', attachments: [], reactions: [] } : m
        )))
      }
    } catch (e) {
      console.error('Failed to delete message', e)
    }
  }

  const loadMessageWithSender = async () => {}

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if ((!newMessage.trim()) || !profile || sending) return

    const content = newMessage.trim()
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const optimisticMsg = {
      id: tempId,
      chat: chatId,
      sender_id: profile.id,
      sender: { id: profile.id, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url },
      content,
      createdAt: new Date().toISOString(),
      seenBy: [],
      attachments: [],
      optimistic: true,
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setNewMessage('')

    setSending(true)
    try {
      const sent = await api.messages.send(chatId, content)
      setMessages((prev) => prev.map((m) => (
        m.id === tempId
          ? {
              ...m,
              id: sent._id || sent.id,
              content: sent.content,
              createdAt: sent.createdAt,
              optimistic: false,
            }
          : m
      )))
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.map((m) => (
        m.id === tempId ? { ...m, optimistic: false, sendingError: true } : m
      )))
    } finally {
      setSending(false)
    }
  }

  // attachments
  const handlePickFiles = () => {
    try { fileInputRef.current?.click() } catch (_) {}
  }

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target?.files || [])
    if (files.length === 0 || !profile || sending) return
    setSending(true)
    try {
      const uploaded = []
      for (const f of files) {
        const meta = await api.uploads.file(f)
        uploaded.push(meta)
      }
      const payload = { attachments: uploaded, content: newMessage.trim() }
      const sent = await api.messages.send(chatId, payload)
      setMessages((prev) => {
        const incomingId = sent._id || sent.id
        if (incomingId && prev.some((m) => m.id === incomingId)) return prev
        return [
          ...prev,
          {
            id: incomingId,
            chat: chatId,
            sender_id: sent.sender?._id || sent.sender?.id || profile.id,
            sender: sent.sender || { id: profile.id, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url },
            content: sent.content,
            createdAt: sent.createdAt,
            seenBy: [],
            attachments: sent.attachments || uploaded,
          },
        ]
      })
      setNewMessage('')
    } catch (err) {
      console.error('Error sending attachments:', err)
    } finally {
      setSending(false)
      if (e.target) e.target.value = ''
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const shouldShowDateSeparator = (index) => {
    if (index === 0) return true
    const currentDate = new Date(messages[index].createdAt || messages[index].created_at).toDateString()
    const previousDate = new Date(messages[index - 1].createdAt || messages[index - 1].created_at).toDateString()
    return currentDate !== previousDate
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-gray-500 dark:text-slate-400">Loading messages...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {chatInfo?.isGroup ? (
            chatInfo?.group_avatar_url ? (
              <img src={normalizeUrl(chatInfo.group_avatar_url)} alt={chatInfo?.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            )
          ) : (
            <div className="relative">
              {chatInfo?.participants?.find((p) => p.id !== profile?.id)?.avatar_url ? (
                <img
                  src={normalizeUrl(chatInfo.participants.find((p) => p.id !== profile?.id)?.avatar_url)}
                  alt={chatInfo?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-gray-600 dark:text-slate-200 font-medium">
                    {chatInfo?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
              {chatInfo?.participants?.find((p) => p.id !== profile?.id)?.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">{chatInfo?.name}</h2>
            {chatInfo?.isGroup ? (
              typingUsers.size > 0 ? (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {Array.from(typingUsers)
                    .map((id) => chatInfo.participants?.find((p) => p.id === id)?.full_name || chatInfo.participants?.find((p) => p.id === id)?.username)
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(', ')}{typingUsers.size > 2 ? ' and others' : ''} are typing...
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500 dark:text-slate-400">{chatInfo.participants?.length} members</p>
                  <div className="flex -space-x-2">
                    {chatInfo.participants?.slice(0, 4).map((m) => (
                      <img key={m.id} src={m.avatar_url ? normalizeUrl(m.avatar_url) : ''} alt={m.username} className="w-5 h-5 rounded-full border border-white dark:border-slate-900 object-cover bg-gray-200 dark:bg-slate-700" />
                    ))}
                  </div>
                </div>
              )
            ) : typingUsers.size > 0 ? (
              <p className="text-sm text-blue-600 dark:text-blue-400">Typing...</p>
            ) : (
              <p className={`text-sm ${chatInfo?.participants?.find((p) => p.id !== profile?.id)?.is_online ? 'text-green-600' : 'text-gray-500 dark:text-slate-400'}`}>
                {chatInfo?.participants?.find((p) => p.id !== profile?.id)?.is_online ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleClearChat} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" title="Clear messages">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </button>
          <button onClick={() => setShowInfo(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" title="Group info">
            <EllipsisVertical className="w-5 h-5 text-gray-700 dark:text-slate-200" />
          </button>
          {chatInfo?.isGroup && chatInfo?.created_by && String(chatInfo.created_by) === String(profile?.id) && (
            <button onClick={() => setShowManage(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200">
              <Settings className="w-4 h-4" />
              <span className="text-sm">Manage</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
        {messages.map((message, index) => (
          <div key={message.id || `${message.createdAt || message.created_at}-${index}`}>
            {shouldShowDateSeparator(index) && (
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-200 text-xs px-3 py-1 rounded-full">
                  {formatDate(message.createdAt || message.created_at)}
                </div>
              </div>
            )}
            <div className={`flex ${message.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[70%] ${message.sender_id === profile?.id ? 'flex-row-reverse' : 'flex-row'}`}>
                {message.sender_id !== profile?.id && (
                  <div className="flex-shrink-0">
                    {message.sender?.avatar_url ? (
                      <img src={normalizeUrl(message.sender.avatar_url)} alt={message.sender.username} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-xs text-gray-600 dark:text-slate-200 font-medium">
                          {message.sender?.username?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {message.sender_id === profile?.id && (
                  <div className="flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img src={normalizeUrl(profile.avatar_url)} alt={profile?.username || 'Me'} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-xs text-gray-600 dark:text-slate-200 font-medium">
                          {profile?.username?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className={`relative`}>
                  {message.sender_id !== profile?.id && chatInfo?.isGroup && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1 ml-1">
                      {message.sender?.full_name || message.sender?.username}
                    </p>
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${message.sender_id === profile?.id ? 'bg-blue-600 text-white dark:bg-blue-500' : 'bg-white text-gray-900 border border-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'}`}>
                    {message.isDeleted ? (
                      <p className={`text-xs italic ${message.sender_id === profile?.id ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400'}`}>
                        {(() => {
                          const whoId = message.deletedBy
                          const who = whoId === profile?.id
                            ? (profile?.full_name || profile?.username || 'You')
                            : (chatInfo?.participants?.find((p) => String(p.id) === String(whoId))?.full_name || chatInfo?.participants?.find((p) => String(p.id) === String(whoId))?.username || 'Someone')
                          return `${who} deleted a message.`
                        })()}
                      </p>
                    ) : (
                      <>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="space-y-2 mb-1">
                            {message.attachments.map((att, i) => (
                              att.type === 'image' ? (
                                <img key={i} src={att.url} alt={att.name || 'image'} className="max-w-xs rounded-lg" />
                              ) : (
                                <a key={i} href={att.url} target="_blank" rel="noreferrer" className="text-sm underline break-all">
                                  {att.name || att.url}
                                </a>
                              )
                            ))}
                          </div>
                        )}
                        {message.content && <p className="break-words">{message.content}</p>}
                      </>
                    )}
                    <p className={`text-xs mt-1 ${message.sender_id === profile?.id ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400'}`}>
                      {formatTime(message.createdAt || message.created_at)}
                      {message.sender_id === profile?.id && (
                        <span className="ml-1">{(message.seenBy && message.seenBy.length > 0) ? '✓✓' : '✓'}</span>
                      )}
                    </p>
                  </div>
                  {(() => {
                    // Delete button visibility
                    // - Direct chat: only your own messages
                    // - Group chat: only admin (creator) can delete any message
                    const isDirect = !chatInfo?.isGroup
                    const isAdmin = !!(chatInfo?.isGroup && String(chatInfo?.created_by) === String(profile?.id))
                    const canDelete = (isDirect && message.sender_id === profile?.id) || (isAdmin && chatInfo?.isGroup)
                    if (message.deletedByAdmin) return null
                    return canDelete ? (
                      <button
                        onClick={() => deleteMessageLocal(message.id)}
                        className={`absolute ${message.sender_id === profile?.id ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400`}
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null
                  })()}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button type="button" onClick={handlePickFiles} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <Paperclip className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>
          <input ref={fileInputRef} onChange={handleFilesSelected} type="file" multiple className="hidden" />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => { setNewMessage(e.target.value); emitTyping() }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            disabled={sending}
            autoFocus
          />
          <button type="button" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <Mic className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">Clear messages</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">Choose how you want to clear messages in this conversation.</p>
            {clearError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{clearError}</p>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button disabled={clearingForMe} onClick={clearChatForMe} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 w-full sm:w-auto">
                {clearingForMe ? 'Clearing…' : 'Delete for me'}
              </button>
              {(!chatInfo?.isGroup || (chatInfo?.isGroup && String(chatInfo?.created_by) === String(profile?.id))) && (
                <button disabled={clearing || clearingForMe} onClick={confirmClearChat} className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 w-full sm:w-auto">
                  {clearing ? 'Clearing…' : (!chatInfo?.isGroup ? 'Delete for everyone' : 'Delete for everyone (group)')}
                </button>
              )}
              <button disabled={clearing || clearingForMe} onClick={() => setShowConfirmClear(false)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 w-full sm:w-auto">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showManage && chatInfo?.isGroup && (
        <ManageGroupModal
          chatId={chatInfo.id}
          name={chatInfo.name}
          avatarUrl={chatInfo.group_avatar_url}
          participants={chatInfo.participants}
          onClose={() => setShowManage(false)}
          onUpdated={() => loadChatInfo()}
        />
      )}
      {showInfo && chatInfo?.isGroup && (
        <GroupInfoModal
          onClose={() => setShowInfo(false)}
          name={chatInfo.name}
          avatarUrl={chatInfo.group_avatar_url}
          participants={chatInfo.participants}
          adminId={chatInfo.created_by}
        />
      )}
      {showInfo && chatInfo && !chatInfo.isGroup && (
        <PeopleInfoModal
          onClose={() => setShowInfo(false)}
          user={chatInfo.participants?.find((p) => String(p.id) !== String(profile?.id))}
        />
      )}
    </div>
  )
}
