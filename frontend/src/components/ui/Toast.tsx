import React, { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import * as m from 'framer-motion/m'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, 'id'>) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (options: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const duration = options.duration ?? 4500
      const newToast: ToastItem = { ...options, id, duration }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const success = useCallback(
    (title: string, message?: string) => addToast({ type: 'success', title, message }),
    [addToast]
  )
  const error = useCallback(
    (title: string, message?: string) => addToast({ type: 'error', title, message }),
    [addToast]
  )
  const warning = useCallback(
    (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    [addToast]
  )
  const info = useCallback(
    (title: string, message?: string) => addToast({ type: 'info', title, message }),
    [addToast]
  )

  const typeConfig: Record<
    ToastType,
    { icon: React.ReactNode; bg: string; border: string; text: string }
  > = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-lime" />,
      bg: 'bg-navy-card/95',
      border: 'border-lime/30',
      text: 'text-lime',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-brand-red" />,
      bg: 'bg-navy-card/95',
      border: 'border-brand-red/30',
      text: 'text-brand-red',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-brand-orange" />,
      bg: 'bg-navy-card/95',
      border: 'border-brand-orange/30',
      text: 'text-brand-orange',
    },
    info: {
      icon: <Info className="w-4 h-4 text-brand-teal" />,
      bg: 'bg-navy-card/95',
      border: 'border-brand-teal/30',
      text: 'text-teal-300',
    },
  }

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const conf = typeConfig[t.type]
            return (
              <m.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto rounded-xl border p-4 shadow-2xl backdrop-blur-md flex items-start gap-3 text-white ${conf.bg} ${conf.border}`}
              >
                <div className="shrink-0 mt-0.5">{conf.icon}</div>
                <div className="flex-1">
                  <div className={`font-semibold text-xs tracking-wide ${conf.text}`}>
                    {t.title}
                  </div>
                  {t.message && (
                    <div className="text-xs text-white/70 mt-0.5 leading-relaxed">
                      {t.message}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  aria-label="Dismiss toast"
                  className="p-1 rounded text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </m.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
