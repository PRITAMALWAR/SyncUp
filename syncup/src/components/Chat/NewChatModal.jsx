import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { X, Search, User } from 'lucide-react'

export default function NewChatModal({ onClose, onChatCreated }) {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_BASE}${url}`
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUsers = async () => {
    try {
      const data = await api.users.list()
      const mapped = (data || []).map((u) => ({
        id: u._id || u.id,
        username: u.username,
        full_name: u.fullName,
        avatar_url: u.avatarUrl,
        is_online: u.isOnline,
      }))
      setUsers(mapped)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const createChatLocal = async (userId) => {
    if (!profile || creating) return

    setCreating(true)
    try {
      const newChat = await api.chats.createDirect(userId)
      onChatCreated(newChat._id || newChat.id)
      onClose()
    } catch (err) {
      console.error('Error creating chat:', err)
    } finally {
      setCreating(false)
    }
  }

  const filteredUsers = users.filter((u) =>
    `${u.username || ''} ${u.full_name || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">New Chat</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Loading users...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">No users found</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => createChatLocal(u.id)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <div className="relative">
                    {u.avatar_url ? (
                      <img src={resolveUrl(u.avatar_url)} alt={u.username} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                    {u.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">{u.full_name || u.username}</h3>
                    <p className="text-sm text-gray-500">@{u.username}</p>
                  </div>
                  {u.is_online && <span className="text-xs text-green-600 font-medium">Online</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
