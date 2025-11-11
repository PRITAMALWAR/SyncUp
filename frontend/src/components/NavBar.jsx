import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { MessageSquare, User, LogOut, Menu, Users } from 'lucide-react'

export default function NavBar({ onOpenProfile, onToggleSidebar, onOpenCreateGroup }) {
  const { signOut, profile } = useAuth()
  const [totalUnread, setTotalUnread] = useState(0)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_BASE}${url}`
  }
  useEffect(() => {
    const onUnread = (e) => {
      const n = e?.detail?.total || 0
      setTotalUnread(n)
    }
    window.addEventListener('unread:total', onUnread)
    return () => window.removeEventListener('unread:total', onUnread)
  }, [])
  return (
    <header className="fixed top-0 inset-x-0 z-40 w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            title="Menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <div className="relative w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <span className="font-semibold text-gray-900">SyncUp</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateGroup}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            title="Create group"
          >
            <Users className="w-4 h-4" />
            <span>Create group</span>
          </button>
          <button
            onClick={onOpenCreateGroup}
            className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
            title="Create group"
          >
            <Users className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={onOpenProfile}
            className="p-1 rounded-full hover:ring-2 hover:ring-blue-500/30"
            title="Profile"
          >
            {profile?.avatar_url ? (
              <img
                src={resolveUrl(profile.avatar_url)}
                alt={profile?.username || 'Profile'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </button>
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Sign out"
          >
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  )
}

