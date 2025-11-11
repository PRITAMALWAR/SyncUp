import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { refreshSocketAuth, disconnectSocket } from '../lib/socket'
import { useToast } from './ToastContext.jsx'

const mapServerUserToProfile = (u = {}) => ({
  id: u.id || u._id,
  username: u.username || '',
  full_name: u.fullName || u.full_name || '',
  avatar_url: u.avatarUrl || u.avatar_url || '',
  bio: u.bio || '',
  updated_at: u.updatedAt || u.updated_at || new Date().toISOString(),
})

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          refreshSocketAuth(token)
          const me = await api.auth.me().catch(() => null)
          if (me) {
            const mapped = mapServerUserToProfile(me)
            setUser({ id: me.id || me._id, email: me.email })
            setProfile(mapped)
            persist({ id: me.id || me._id, email: me.email }, mapped)
          }
        } else {
          // fall back to local storage if any
          const storedUser = localStorage.getItem('auth_user')
          const storedProfile = localStorage.getItem('auth_profile')
          if (storedUser && storedProfile) {
            setUser(JSON.parse(storedUser))
            setProfile(JSON.parse(storedProfile))
          }
        }
      } catch (_) {
        // ignore
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const persist = (u, p) => {
    try {
      localStorage.setItem('auth_user', JSON.stringify(u))
      localStorage.setItem('auth_profile', JSON.stringify(p))
    } catch (_) {
      // ignore storage errors
    }
  }

  const signUp = async (email, password, username, fullName) => {
    const me = await api.auth.register({ email, password, username, fullName })
    const token = localStorage.getItem('auth_token')
    if (token) refreshSocketAuth(token)
    const mapped = mapServerUserToProfile(me)
    setUser({ id: me.id || me._id, email: me.email })
    setProfile(mapped)
    persist({ id: me.id || me._id, email: me.email }, mapped)
    toast.success('Account created successfully')
  }

  const signIn = async (email, password) => {
    const me = await api.auth.login({ email, password })
    const token = localStorage.getItem('auth_token')
    if (token) refreshSocketAuth(token)
    const mapped = mapServerUserToProfile(me)
    setUser({ id: me.id || me._id, email: me.email })
    setProfile(mapped)
    persist({ id: me.id || me._id, email: me.email }, mapped)
    toast.success('Logged in successfully')
  }

  const signOut = async () => {
    setUser(null)
    setProfile(null)
    try {
      api.auth.logout()
      disconnectSocket()
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_profile')
    } catch (_) {
      // ignore
    }
    toast.info('Logged out')
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in')
    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() }
    setProfile(updated)
    persist(user, updated)
    toast.success('Profile updated successfully')
  }

  const value = {
    user,
    profile,
    signUp,
    signIn,
    signOut,
    updateProfile,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

