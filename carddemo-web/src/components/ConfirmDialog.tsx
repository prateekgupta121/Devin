import { useEffect, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

// Modal confirmation. Enter/Y confirm, Escape/F12/N cancel.
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', children, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      e.stopImmediatePropagation()
      if (e.key === 'F12' || e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter' || e.key === 'F5' || e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        onConfirm()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, onConfirm, onCancel])

  return (
    <dialog ref={ref} className="confirm" onCancel={(e) => { e.preventDefault(); onCancel() }} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p className="confirm-message">{message}</p>
      {children}
      <div className="confirm-actions">
        <button type="button" className="btn btn-primary" onClick={onConfirm} autoFocus>
          {confirmLabel} <kbd>Y</kbd>
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel <kbd>N</kbd>
        </button>
      </div>
    </dialog>
  )
}
