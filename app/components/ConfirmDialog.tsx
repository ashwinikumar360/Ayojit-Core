'use client'

import { useEffect, useRef } from 'react'

/**
 * ConfirmDialog — Modal confirmation for destructive actions.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Delete Account?"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     variant="danger"
 *     onConfirm={() => handleDelete()}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

const VARIANT_STYLES = {
  danger: { confirmBg: 'bg-red-400 hover:bg-red-500', headerBg: 'bg-red-400' },
  warning: { confirmBg: 'bg-amber-300 hover:bg-amber-400', headerBg: 'bg-amber-300' },
  default: { confirmBg: 'bg-lime-300 hover:bg-lime-400', headerBg: 'bg-yellow-300' },
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const styles = VARIANT_STYLES[variant]

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter') {
        onConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    confirmBtnRef.current?.focus()

    // Prevent body scroll while dialog is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        ref={dialogRef}
        className="relative border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
                   w-full max-w-md mx-4 animate-toast-enter"
      >
        {/* Header */}
        <div className={`${styles.headerBg} border-b-4 border-black p-4`}>
          <h2
            id="confirm-dialog-title"
            className="text-xl font-black uppercase tracking-tight"
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="font-bold text-sm text-zinc-700 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t-2 border-black bg-zinc-50">
          <button
            onClick={onCancel}
            className="flex-1 border-3 border-black bg-white px-4 py-2.5 font-black text-sm uppercase
                       shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                       hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`flex-1 border-3 border-black ${styles.confirmBg} px-4 py-2.5 font-black text-sm uppercase
                       shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                       hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
