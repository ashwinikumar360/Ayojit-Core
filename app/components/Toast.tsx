'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

/**
 * Toast notification system with Neo-Brutalism styling.
 *
 * Usage:
 *   const { addToast } = useToast()
 *   addToast({ type: 'success', message: 'Profile updated!' })
 */

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: 'bg-lime-300', border: 'border-black' },
  error: { bg: 'bg-red-400', border: 'border-black' },
  info: { bg: 'bg-yellow-300', border: 'border-black' },
  warning: { bg: 'bg-amber-300', border: 'border-black' },
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100)
  const duration = toast.duration || 4000

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onDismiss(toast.id)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [toast.id, duration, onDismiss])

  const colors = TOAST_COLORS[toast.type]
  const icon = TOAST_ICONS[toast.type]

  return (
    <div
      className={`border-4 ${colors.border} ${colors.bg} p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                   animate-toast-enter relative overflow-hidden min-w-[300px] max-w-[420px]`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <p className="font-bold text-sm text-black flex-1">{toast.message}</p>
        <button
          onClick={() => onDismiss(toast.id)}
          className="font-black text-black hover:opacity-60 text-sm flex-shrink-0"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-black/20 w-full">
        <div
          className="h-full bg-black/40 transition-all ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
