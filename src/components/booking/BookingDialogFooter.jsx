import { createPortal } from 'react-dom'

export function BookingDialogFooter({ target, children, className = '' }) {
  const footer = <div className={`booking-dialog-footer ${className}`}>{children}</div>
  if (!target) return footer
  return createPortal(footer, target)
}
