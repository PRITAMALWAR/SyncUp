import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { MessageSquare, Users, Plus, LogOut, Settings, Search } from 'lucide-react'
import { getSocket } from '../../lib/socket'
import { useRef } from 'react'

export default function Sidebar({ selectedChat, onSelectChat, onNewChat, onOpenProfile, mobileOpen = false, hiddenDesktop = false }) {
  const { profile, signOut } = useAuth()
  const [chats, setChats] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [unread, setUnread] = useState({}) // { [chatId]: number }
  const [peopleBadge, setPeopleBadge] = useState({}) // { [userId]: number }
  const [filterTab, setFilterTab] = useState('people') // groups | people
  const chatsRef = useRef([])
  const selectedChatRef = useRef(null)
  const profileRef = useRef(null)
  

  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
    return `${base}${url}`
  }

  const getSenderName = (sender) => {
    try {
      if (!sender) return 'Someone'
      if (typeof sender === 'string') return sender || 'Someone'
      return (
        sender.fullName ||
        sender.full_name ||
        sender.username ||
        sender.name ||
        sender.displayName ||
        sender.display_name ||
        'Someone'
      )
    } catch (_) {
      return 'Someone'
    }
  }

  useEffect(() => {
    loadChats()
    loadPeople()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep refs in sync
  useEffect(() => { chatsRef.current = chats }, [chats])
  useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])
  useEffect(() => { profileRef.current = profile }, [profile])

  useEffect(() => {
    const onCreated = () => { loadChats() }
    window.addEventListener('chat:created', onCreated)
    return () => window.removeEventListener('chat:created', onCreated)
  }, [])

  useEffect(() => {
    const total = Object.values(unread).reduce((a, b) => a + (b || 0), 0)
    const base = 'SyncUp'
    document.title = total > 0 ? `(${total}) ${base}` : base
    try {
      window.dispatchEvent(new CustomEvent('unread:total', { detail: { total } }))
    } catch (_) {}
  }, [unread])

  useEffect(() => {
    const s = getSocket()
    const onPresence = ({ userId, isOnline }) => {
      setChats((prev) => prev.map((c) => ({
        ...c,
        participants: (c.participants || []).map((p) =>
          (p.id === userId || p._id === userId) ? { ...p, is_online: !!isOnline } : p
        ),
      })))
      setPeople((prev) => prev.map((p) =>
        (p.id === userId || p._id === userId) ? { ...p, is_online: !!isOnline } : p
      ))
    }
    const onUserUpdate = ({ userId, avatarUrl }) => {
      setPeople((prev) => prev.map((p) =>
        (p.id === userId || p._id === userId) ? { ...p, avatar_url: avatarUrl || p.avatar_url } : p
      ))
      setChats((prev) => prev.map((c) => ({
        ...c,
        participants: (c.participants || []).map((p) =>
          (p.id === userId || p._id === userId) ? { ...p, avatar_url: avatarUrl || p.avatar_url } : p
        ),
      })))
    }
    const onNewMessage = (payload) => {
      const chatId = payload?.chat?._id || payload?.chat
      const currentProfile = profileRef.current
      const fromMe = (payload?.sender?._id || payload?.sender?.id) === currentProfile?.id
      if (!chatId || fromMe) return
      // increment People badge for the sender if this is from another user
      try {
        const senderId = payload?.sender?._id || payload?.sender?.id
        if (senderId && senderId !== currentProfile?.id) {
          const currentSelected = selectedChatRef.current
          // If currently in a direct chat with the sender, do not increment
          const directChatWithSender = (chatsRef.current || []).find((c) => !c.is_group && (c.participants || []).some((p) => (p.id === senderId || p._id === senderId)) && (c.participants || []).some((p) => (p.id === currentProfile?.id || p._id === currentProfile?.id)))
          const isActiveDirect = directChatWithSender && directChatWithSender.id === currentSelected
          if (!isActiveDirect) {
            setPeopleBadge((prev) => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }))
          }
        }
      } catch (_) {}
      setUnread((prev) => {
        const currentSelected = selectedChatRef.current
        const nextCount = (chatId === currentSelected) ? 0 : ((prev[chatId] || 0) + 1)
        const next = { ...prev, [chatId]: nextCount }
        return next
      })
    }
    s.on('presence:update', onPresence)
    s.on('user:update', onUserUpdate)
    s.on('message:new', onNewMessage)
    
    return () => {
      s.off('presence:update', onPresence)
      s.off('user:update', onUserUpdate)
      s.off('message:new', onNewMessage)
      
    }
  }, [])

  useEffect(() => {
    if (!selectedChat) return
    setUnread((prev) => ({ ...prev, [selectedChat]: 0 }))
    // If selected chat is a direct chat, clear the badge for the other user
    try {
      const chat = (chatsRef.current || []).find((c) => c.id === selectedChat)
      if (chat && !chat.is_group) {
        const meId = profileRef.current?.id
        const other = (chat.participants || []).find((p) => (p.id || p._id) !== meId)
        const otherId = other?._id || other?.id
        if (otherId) setPeopleBadge((prev) => ({ ...prev, [otherId]: 0 }))
      }
    } catch (_) {}
  }, [selectedChat])

  const loadChats = async () => {
    try {
      const data = await api.chats.list()
      const mapped = (data || []).map((c) => ({
        id: c._id || c.id,
        is_group: !!c.isGroup,
        name: c.name || '',
        avatar_url: c.avatarUrl || '',
        last_message: c.lastMessage ? {
          content: c.lastMessage.content,
          created_at: c.lastMessage.createdAt,
          sender_username: c.lastMessage.sender?.username,
        } : null,
        participants: (c.participants || []).map((p) => ({
          id: p._id || p.id,
          username: p.username,
          full_name: p.fullName,
          avatar_url: p.avatarUrl,
          is_online: p.isOnline,
        })),
      }))
      setChats(mapped)
    } catch (error) {
      console.error('Error loading chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPeople = async () => {
    try {
      const users = await api.users.list()
      const mapped = (users || []).map((u) => ({
        id: u._id || u.id,
        username: u.username,
        full_name: u.fullName,
        avatar_url: u.avatarUrl,
        is_online: u.isOnline,
      }))
      setPeople(mapped)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const getChatName = (chat) => {
    if (chat.is_group) return chat.name || 'Group Chat'
    const otherUser = chat.participants.find((p) => (p.id || p._id) !== profile?.id)
    return otherUser?.full_name || otherUser?.username || 'Unknown User'
  }

  const getChatAvatar = (chat) => {
    if (chat.is_group) return null
    const otherUser = chat.participants.find((p) => (p.id || p._id) !== profile?.id)
    return otherUser?.avatar_url
  }

  const getOnlineStatus = (chat) => {
    if (chat.is_group) return false
    const otherUser = chat.participants.find((p) => (p.id || p._id) !== profile?.id)
    return otherUser?.is_online || false
  }

  

  const filteredPeople = people.filter((p) => (
    (p.full_name || p.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  ))

  const startDirectChat = async (userId) => {
    try {
      // Clear badge as user is opening the conversation/profile
      setPeopleBadge((prev) => ({ ...prev, [userId]: 0 }))
      const chat = await api.chats.createDirect(userId)
      const id = chat?._id || chat?.id
      if (id && onSelectChat) onSelectChat(id)
    } catch (e) {
      console.error('Failed to start chat:', e)
    }
  }

  return (
    <div className={`${mobileOpen ? 'block' : 'hidden'} md:block ${hiddenDesktop ? 'md:hidden' : ''} fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-80 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden z-40`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <button onClick={() => setFilterTab('people')} className={`py-1.5 rounded-lg border ${filterTab==='people' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'}`}>People</button>
          <button onClick={() => setFilterTab('groups')} className={`py-1.5 rounded-lg border ${filterTab==='groups' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'}`}>Groups</button>
        </div>
        
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Chats - only for Groups tab */}
        {filterTab === 'groups' && (
        <div className="py-2">
          {chats
            .filter((c) => c.is_group)
            .filter((c) => (getChatName(c) || '').toLowerCase().includes(searchQuery.toLowerCase()))
            .map((c) => {
            const displayName = getChatName(c)
            const isGroup = c.is_group
            const directAvatar = getChatAvatar(c)
            return (
              <button
                key={c.id}
                onClick={() => onSelectChat && onSelectChat(c.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 text-left border-b border-gray-100 dark:border-slate-800"
              >
                <div className="relative">
                  {isGroup ? (
                    c.avatar_url ? (
                      <img src={resolveUrl(c.avatar_url)} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700 dark:text-slate-200">G</span>
                      </div>
                    )
                  ) : directAvatar ? (
                    <img src={resolveUrl(directAvatar)} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                      <span className="text-sm text-gray-600 dark:text-slate-200">{displayName?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  {!isGroup && getOnlineStatus(c) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900 dark:text-slate-100">{displayName}</p>
                    {isGroup && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Group</span>
                    )}
                  </div>
                  {c.last_message ? (
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {(() => {
                        const sender = c.last_message.sender_username
                        if (!sender) return ''
                        if (isGroup) return `${sender}: `
                        const fromMe = sender === profile?.username
                        return `${fromMe ? 'You' : sender}: `
                      })()}
                      {c.last_message.content || 'Attachment'}
                    </p>
                  ) : (
                    !isGroup && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{getOnlineStatus(c) ? 'Online' : 'Offline'}</p>
                    )
                  )}
                </div>
                {unread[c.id] > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
                    {unread[c.id]}
                  </span>
                )}
              </button>
            )
          })}
          {!loading && chats.filter((c)=>c.is_group).length === 0 && (
            <div className="p-4 text-sm text-gray-500 dark:text-slate-400">No chats yet</div>
          )}
        </div>
        )}
        {/* People */}
        {filterTab === 'people' && (
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {filteredPeople
            .filter((p) => ((p.full_name || p.username || '').toLowerCase().includes(searchQuery.toLowerCase())))
            .map((p) => (
            <button
              key={p.id}
              onClick={() => startDirectChat(p.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 text-left"
            >
              <div className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-sm font-medium">
                {p.avatar_url ? (
                  <img src={resolveUrl(p.avatar_url)} alt={p.full_name || p.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-600 dark:text-slate-300">{(p.full_name || p.username || '?').slice(0, 2).toUpperCase()}</span>
                )}
                {p.is_online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-slate-900" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium text-gray-900 dark:text-slate-100">{p.full_name || p.username}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">@{p.username}</p>
              </div>
              {peopleBadge[p.id] > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px]">
                  {peopleBadge[p.id] > 99 ? '99+' : peopleBadge[p.id]}
                </span>
              )}
            </button>
          ))}
          {!loading && filteredPeople.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">No people found</div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

