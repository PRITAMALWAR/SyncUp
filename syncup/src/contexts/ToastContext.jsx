import { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message, { type = 'info', duration = 3000 } = {}) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type, duration }])
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }, [remove])

  const api = useMemo(() => ({
    success: (msg, opts) => push(msg, { type: 'success', ...opts }),
    error: (msg, opts) => push(msg, { type: 'error', ...opts }),
    info: (msg, opts) => push(msg, { type: 'info', ...opts }),
    remove,
  }), [push, remove])

  const value = useMemo(() => ({ toasts, toast: api }), [toasts, api])

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
