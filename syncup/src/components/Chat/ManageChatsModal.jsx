import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { X, Trash2, Users } from 'lucide-react'

export default function ManageChatsModal({ onClose }) {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_BASE}${url}`
  }

  const loadChats = async () => {
    try {
      const data = await api.chats.list()
      const mapped = (data || []).map((c) => ({
        id: c._id || c.id,
        is_group: !!c.isGroup,
        name: c.name || '',
        participants: (c.participants || []).map((p) => ({
          id: p._id || p.id,
          username: p.username,
          full_name: p.fullName,
          avatar_url: p.avatarUrl,
          is_online: p.isOnline,
        })),
      }))
      setChats(mapped)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load chats', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChats()
  }, [])

  const otherUser = (chat) => {
    // Assumes parent knows current user; we only show first non-null
    return (chat.participants || [])[0]
  }

  const handleDeleteChat = async (chatId) => {
    if (!chatId || busyId) return
    setBusyId(chatId)
    try {
      await api.chats.delete(chatId)
      setChats((prev) => prev.filter((c) => c.id !== chatId))
      window.dispatchEvent(new CustomEvent('chat:deleted', { detail: { chatId } }))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Delete chat failed', e)
    } finally {
      setBusyId('')
    }
  }

  

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Manage Chats</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-gray-500 dark:text-slate-400 text-center">Loading chats...</div>
          ) : chats.length === 0 ? (
            <div className="text-gray-500 dark:text-slate-400 text-center">No chats</div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => {
                const other = otherUser(chat)
                return (
                  <div key={chat.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                      {chat.is_group ? (
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : (
                        <div className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-sm font-medium">
                          {other?.avatar_url ? (
                            <img src={resolveUrl(other.avatar_url)} alt={other?.full_name || other?.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-600 dark:text-slate-300">{(other?.full_name || other?.username || '?').slice(0,2).toUpperCase()}</span>
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-slate-100">{chat.is_group ? (chat.name || 'Group Chat') : (other?.full_name || other?.username)}</p>
                        {!chat.is_group && <p className="text-xs text-gray-500 dark:text-slate-400 truncate">@{other?.username}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteChat(chat.id)}
                      disabled={!!busyId}
                      className="px-3 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
