import React from 'react'

export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', retry }) {
  return (
    <div className="error-state" role="alert">
      <span className="error-icon" aria-hidden="true">⚠</span>
      <p>{message}</p>
      {retry && <button onClick={retry} className="button button-outline">Try again</button>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state-card">
      {icon && <div className="empty-icon" aria-hidden="true">{icon}</div>}
      {title && <strong>{title}</strong>}
      {description && <span>{description}</span>}
      {action}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    published: { label: 'Published', cls: 'badge-published' },
    draft: { label: 'Draft', cls: 'badge-draft' },
    archived: { label: 'Archived', cls: 'badge-archived' },
    pending: { label: 'Pending', cls: 'badge-pending' },
    approved: { label: 'Approved', cls: 'badge-approved' },
    rejected: { label: 'Rejected', cls: 'badge-rejected' },
    hidden: { label: 'Hidden', cls: 'badge-hidden' },
  }
  const { label, cls } = map[status] || { label: status, cls: '' }
  return <span className={`status-badge ${cls}`}>{label}</span>
}

export function ConfirmationDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <h3 id="confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="button button-outline" onClick={onCancel}>Cancel</button>
          <button className="button button-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function Toast({ message, type = 'success' }) {
  if (!message) return null
  return (
    <div className={`toast toast-${type}`} role="status" aria-live="assertive">
      <span>{message}</span>
    </div>
  )
}
