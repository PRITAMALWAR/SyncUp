import { X, Crown } from 'lucide-react'

export default function GroupInfoModal({ onClose, name, avatarUrl, participants = [], adminId }) {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${API_BASE}${url}`
  }

  const admin = participants.find((p) => String(p.id || p._id) === String(adminId))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Group info</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" title="Close">
            <X className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{participants.length} members</p>
          </div>

          {admin && (
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Admin</p>
              <p className="text-sm text-gray-900 dark:text-slate-100 inline-flex items-center gap-1">
                {admin.full_name || admin.username}
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Members</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
              {participants.map((m) => (
                <div key={m.id || m._id} className="p-2">
                  <p className="text-sm text-gray-900 dark:text-slate-100">
                    {m.full_name || m.username}
                    {String(m.id || m._id) === String(adminId) && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 align-middle"><Crown className="w-3 h-3" /> Admin</span>
                    )}
                  </p>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="p-3 text-center text-sm text-gray-500 dark:text-slate-400">No members</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
