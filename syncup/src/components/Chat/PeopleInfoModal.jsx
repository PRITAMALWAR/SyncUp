import { X } from 'lucide-react'

export default function PeopleInfoModal({ onClose, user }) {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${API_BASE}${url}`
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Profile</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" title="Close">
            <X className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
              {user.avatar_url ? (
                <img src={resolveUrl(user.avatar_url)} alt={user.full_name || user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-gray-700 dark:text-slate-200">{(user.full_name || user.username || '?').slice(0,2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{user.full_name || user.username}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">@{user.username}</p>
              {typeof user.is_online === 'boolean' && (
                <p className={`text-xs ${user.is_online ? 'text-green-600' : 'text-gray-500 dark:text-slate-400'}`}>{user.is_online ? 'Online' : 'Offline'}</p>
              )}
            </div>
          </div>

          {user.bio && (
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Bio</p>
              <p className="text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
