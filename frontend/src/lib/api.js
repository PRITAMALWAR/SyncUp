const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function getToken() {
  return localStorage.getItem('auth_token') || ''
}

function setToken(token) {
  if (token) localStorage.setItem('auth_token', token)
  else localStorage.removeItem('auth_token')
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const t = getToken()
    if (t) headers['Authorization'] = `Bearer ${t}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Request failed')
  return data
}

export const api = {
  setToken,
  auth: {
    async register({ email, password, username, fullName }) {
      const res = await request('/api/auth/register', { method: 'POST', body: { email, password, username, fullName }, auth: false })
      setToken(res.token)
      return res.user
    },
    async login({ email, password }) {
      const res = await request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false })
      setToken(res.token)
      return res.user
    },
    async me() {
      return (await request('/api/auth/me')).user
    },
    logout() { setToken('') },
  },
  users: {
    async list(q = '') {
      const url = q ? `/api/users?q=${encodeURIComponent(q)}` : '/api/users'
      return (await request(url)).users
    },
  },
  chats: {
    async list() {
      return (await request('/api/chats')).chats
    },
    async get(chatId) {
      return (await request(`/api/chats/${chatId}`)).chat
    },
    async createDirect(userId) {
      return (await request('/api/chats', { method: 'POST', body: { userId } })).chat
    },
    async createGroup(name, memberIds, avatarUrl = '') {
      return (await request('/api/chats/group', { method: 'POST', body: { name, memberIds, avatarUrl } })).chat
    },
    async renameGroup(chatId, name) {
      return (await request(`/api/chats/${chatId}/name`, { method: 'PATCH', body: { name } })).chat
    },
    async updateGroupAvatar(chatId, avatarUrl) {
      return (await request(`/api/chats/${chatId}/avatar`, { method: 'PATCH', body: { avatarUrl } })).chat
    },
    async addMembers(chatId, memberIds) {
      return (await request(`/api/chats/${chatId}/members`, { method: 'POST', body: { memberIds } })).chat
    },
    async removeMember(chatId, userId) {
      return (await request(`/api/chats/${chatId}/members/${userId}`, { method: 'DELETE' })).chat
    },
    async delete(chatId) {
      return await request(`/api/chats/${chatId}`, { method: 'DELETE' })
    },
  },
  messages: {
    async list(chatId) {
      return (await request(`/api/messages/${chatId}`)).messages
    },
    async send(chatId, contentOrPayload) {
      const body = (typeof contentOrPayload === 'object' && contentOrPayload !== null)
        ? contentOrPayload
        : { content: contentOrPayload }
      return (await request(`/api/messages/${chatId}`, { method: 'POST', body })).message
    },
    async markRead(chatId) {
      return await request(`/api/messages/${chatId}/read`, { method: 'POST' })
    },
    async clearChat(chatId) {
      return await request(`/api/messages/${chatId}/clear`, { method: 'DELETE' })
    },
    async clearForMe(chatId) {
      return await request(`/api/messages/${chatId}/clear/me`, { method: 'POST' })
    },
    async clearAll() {
      return await request(`/api/messages/clear/all`, { method: 'DELETE' })
    },
    async deleteOne(messageId) {
      return await request(`/api/messages/item/${messageId}`, { method: 'DELETE' })
    },
  },
  uploads: {
    async avatar(file) {
      const t = getToken()
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/api/uploads/avatar`, {
        method: 'POST',
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      const url = data?.url?.startsWith('http') ? data.url : `${API_BASE}${data.url}`
      return url
    },
    async file(file) {
      const t = getToken()
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/api/uploads/file`, {
        method: 'POST',
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      if (data?.url && !data.url.startsWith('http')) {
        data.url = `${API_BASE}${data.url}`
      }
      return data
    },
  },
}
