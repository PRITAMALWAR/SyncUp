import { useEffect, useMemo, useState } from 'react'
import { X, Users, Image as ImageIcon, Check } from 'lucide-react'
import { api } from '../../lib/api'

export default function NewGroupModal({ onClose, onGroupCreated }) {
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(new Set()) // userIds

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    ))
  }, [users, query])

  async function loadUsers() {
    try {
      const list = await api.users.list()
      setUsers(list)
    } catch (e) {
      console.error('Failed to load users', e)
    }
  }

  const countSelected = selected.size
  const canSubmit = name.trim().length > 0 && countSelected >= 1 && countSelected <= 5 && !saving && !uploading

  const handleToggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleUpload = async (file) => {
    if (!file) return
    try {
      setUploading(true)
      const url = await api.uploads.avatar(file)
      setAvatarUrl(url)
    } catch (e) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!canSubmit) return
    try {
      setSaving(true)
      const memberIds = Array.from(selected)
      const chat = await api.chats.createGroup(name.trim(), memberIds, avatarUrl)
      // notify sidebar to refresh and parent to select chat
      window.dispatchEvent(new CustomEvent('chat:created', { detail: { chatId: chat?._id || chat?.id } }))
      if (onGroupCreated) onGroupCreated(chat?._id || chat?.id)
      if (onClose) onClose()
    } catch (e) {
      setError(e?.message || 'Failed to create group')
    } finally {
      setSaving(false)
    }
  }

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_BASE}${url}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-gray-900 dark:text-slate-100">
            <Users className="w-5 h-5" />
            <h3 className="font-semibold">Create Group</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          {error && (
            <div className="p-2 text-sm rounded border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Team Alpha"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Group avatar</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={resolveUrl(avatarUrl)} alt="Group avatar" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                <ImageIcon className="w-4 h-4 text-gray-700 dark:text-slate-300" />
                <span className="text-sm text-gray-700 dark:text-slate-300">Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Members (select 1–5)</label>
              <span className="text-xs text-gray-500 dark:text-slate-400">{countSelected} selected</span>
            </div>
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search users..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="max-h-56 overflow-y-auto border rounded-lg border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <label key={u._id || u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(u._id || u.id)}
                    onChange={() => handleToggle(u._id || u.id)}
                  />
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
                    {u.avatarUrl ? (
                      <img src={resolveUrl(u.avatarUrl)} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-600 dark:text-slate-300">{(u.fullName || u.username || '?').slice(0,2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-slate-100 truncate">{u.fullName || u.username}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">@{u.username}</p>
                  </div>
                  {selected.has(u._id || u.id) && <Check className="w-4 h-4 text-blue-600" />}
                </label>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">No users found</div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Total group size must be between 2 and 6 (including you).</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300">Cancel</button>
            <button type="submit" disabled={!canSubmit} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Creating...' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
