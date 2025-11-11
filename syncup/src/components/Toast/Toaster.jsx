import { useEffect } from 'react'
import { useToast } from '../../contexts/ToastContext'

export default function Toaster() {
  const { toasts, toast } = useToast()

  useEffect(() => {
    // cleanup expired toasts handled in context via timeout
  }, [toasts])

  return (
    <div className="fixed top-16 right-4 z-50 space-y-2 w-[min(360px,calc(100vw-2rem))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-lg border p-3 shadow-md bg-white ${
            t.type === 'success' ? 'border-green-200' : t.type === 'error' ? 'border-red-200' : 'border-gray-200'
          }`}
        >
          <div
            className={`mt-1 h-2 w-2 rounded-full ${
              t.type === 'success' ? 'bg-green-500' : t.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}
          />
          <div className="text-sm text-gray-800 flex-1">{t.message}</div>
          <button
            onClick={() => toast.remove(t.id)}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
