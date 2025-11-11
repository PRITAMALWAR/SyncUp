import { useEffect, useMemo, useState } from 'react'
import { X, Image as ImageIcon, Trash2, Plus } from 'lucide-react'
import { api } from '../../lib/api'

export default function ManageGroupModal({ chatId, name: initialName, avatarUrl: initialAvatarUrl, participants = [], onClose, onUpdated }) {
  const [name, setName] = useState(initialName || '')
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [selectedToAdd, setSelectedToAdd] = useState(new Set())
  const [currentMembers, setCurrentMembers] = useState(participants)

  useEffect(() => {
    loadUsers()
  }, [])

  // Keep modal state in sync if parent passes new props (e.g., switching chats or after refresh)
  useEffect(() => {
    setName(initialName || '')
    setAvatarUrl(initialAvatarUrl || '')
    const mapped = (participants || []).map((p) => ({
      id: p._id || p.id,
      username: p.username,
      full_name: p.fullName || p.full_name,
      avatar_url: p.avatarUrl || p.avatar_url,
    }))
    setCurrentMembers(mapped)
  }, [initialName, initialAvatarUrl, participants])

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${API_BASE}${url}`
  }

  const handleDeleteGroup = async () => {
    setError('')
    if (!chatId) return
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return
    try {
      setDeleting(true)
      await api.chats.delete(chatId)
      // notify app and close
      try { window.dispatchEvent(new CustomEvent('chat:deleted', { detail: { chatId } })) } catch (_) {}
      onClose && onClose()
    } catch (e) {
      setError(e?.message || 'Failed to delete group')
    } finally {
      setDeleting(false)
    }
  }

  async function loadUsers() {
    try {
      const list = await api.users.list()
      setUsers(list)
    } catch (e) {
      console.error('Failed to load users', e)
    }
  }

  const memberIds = new Set(currentMembers.map((m) => m.id || m._id))
  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users
      .filter((u) => !memberIds.has(u._id || u.id))
      .filter((u) => !q || (u.fullName || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q))
  }, [users, memberIds, query])

  const handleUpload = async (file) => {
    if (!file) return
    setError('')
    try {
      setSaving(true)
      const url = await api.uploads.avatar(file)
      await api.chats.updateGroupAvatar(chatId, url)
      setAvatarUrl(url)
      onUpdated && onUpdated()
    } catch (e) {
      setError(e?.message || 'Failed to update group avatar')
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async (e) => {
    e.preventDefault()
    setError('')
    try {
      setSaving(true)
      await api.chats.renameGroup(chatId, name.trim())
      onUpdated && onUpdated()
    } catch (e) {
      setError(e?.message || 'Failed to rename group')
    } finally {
      setSaving(false)
    }
  }

  const toggleAdd = (id) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddMembers = async () => {
    setError('')
    const toAdd = Array.from(selectedToAdd)
    if (toAdd.length === 0) return
    const newTotal = currentMembers.length + toAdd.length
    if (newTotal > 6) {
      setError('Group cannot exceed 6 members')
      return
    }
    try {
      setSaving(true)
      const chat = await api.chats.addMembers(chatId, toAdd)
      const updated = (chat.participants || []).map((p) => ({
        id: p._id || p.id,
        username: p.username,
        full_name: p.fullName,
        avatar_url: p.avatarUrl,
      }))
      setCurrentMembers(updated)
      setSelectedToAdd(new Set())
      onUpdated && onUpdated()
    } catch (e) {
      setError(e?.message || 'Failed to add members')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (userId) => {
    setError('')
    if (currentMembers.length <= 2) {
      setError('Group must have at least 2 members')
      return
    }
    try {
      setSaving(true)
      const chat = await api.chats.removeMember(chatId, userId)
      const updated = (chat.participants || []).map((p) => ({
        id: p._id || p.id,
        username: p.username,
        full_name: p.fullName,
        avatar_url: p.avatarUrl,
      }))
      setCurrentMembers(updated)
      onUpdated && onUpdated()
    } catch (e) {
      setError(e?.message || 'Failed to remove member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mx-auto w-full h-[100dvh] md:h-auto md:max-w-lg md:max-h-[85vh] md:my-10 bg-white dark:bg-slate-900 rounded-none md:rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Manage Group</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
          {error && <div className="p-2 text-sm rounded border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Group avatar</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
                {avatarUrl ? <img src={resolveUrl(avatarUrl)} alt="Group avatar" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-500" />}
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                <ImageIcon className="w-4 h-4 text-gray-700 dark:text-slate-300" />
                <span className="text-sm text-gray-700 dark:text-slate-300">Change avatar</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          {/* Rename */}
          <form onSubmit={handleRename} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Group name</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Team name"
                required
              />
              <button type="submit" disabled={saving || !name.trim()} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 w-full sm:w-auto">Save</button>
            </div>
          </form>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">Members</h4>
              <span className="text-xs text-gray-500 dark:text-slate-400">{currentMembers.length} total</span>
            </div>
            <div className="max-h-56 md:max-h-40 overflow-y-auto border rounded-lg border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800 min-h-0">
              {currentMembers.map((m) => (
                <div key={m.id || m._id || m.username} className="flex items-center gap-3 p-2">
                  {m.avatar_url ? (
                    <img src={resolveUrl(m.avatar_url)} alt={m.username} className="w-8 h-8 rounded-full object-cover bg-gray-200 dark:bg-slate-700" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs text-gray-700 dark:text-slate-200">
                      {(m.full_name || m.username || '?').slice(0,2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-slate-100 truncate">{m.full_name || m.username}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">@{m.username}</p>
                  </div>
                  <button onClick={() => handleRemove(m.id)} className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600" title="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">Add members (max 6)</h4>
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="max-h-56 md:max-h-40 overflow-y-auto border rounded-lg border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800 min-h-0">
              {filteredCandidates.map((u) => (
                <label key={u._id || u.id || u.username} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" checked={selectedToAdd.has(u._id || u.id)} onChange={() => toggleAdd(u._id || u.id)} />
                  {u.avatarUrl ? (
                    <img src={resolveUrl(u.avatarUrl)} alt={u.username} className="w-8 h-8 rounded-full object-cover bg-gray-200 dark:bg-slate-700" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs text-gray-700 dark:text-slate-200">
                      {(u.fullName || u.username || '?').slice(0,2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-slate-100 truncate">{u.fullName || u.username}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">@{u.username}</p>
                  </div>
                </label>
              ))}
              {filteredCandidates.length === 0 && (
                <div className="p-3 text-center text-sm text-gray-500 dark:text-slate-400">No candidates</div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={handleAddMembers} disabled={saving || selectedToAdd.size === 0} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 w-full sm:w-auto">
                <Plus className="w-4 h-4" /> Add selected
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="pt-2 border-t border-gray-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-red-600 mb-2">Danger zone</h4>
            <button
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50 w-full sm:w-auto"
            >
              {deleting ? 'Deleting...' : 'Delete group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
