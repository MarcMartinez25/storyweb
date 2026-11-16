import { useEffect, useState, type ReactNode } from 'react'

/**
 * A button that asks "are you sure?" inline instead of using window.confirm(),
 * which some browsers and embedded webviews silently block (it just returns false).
 */
export function ConfirmButton({
  children,
  prompt,
  confirmLabel = 'Yes, remove',
  onConfirm,
  className,
  block = false,
}: {
  children: ReactNode
  prompt: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  className?: string
  /** Full-width layout (for panels) instead of an inline row (for small action links). */
  block?: boolean
}) {
  const [asking, setAsking] = useState(false)

  // Quietly back out if the question is left hanging.
  useEffect(() => {
    if (!asking) return
    const t = window.setTimeout(() => setAsking(false), 12_000)
    return () => window.clearTimeout(t)
  }, [asking])

  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    )
  }

  return (
    <span
      className={`confirm-inline${block ? ' is-block' : ''}`}
      role="group"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          setAsking(false)
        }
      }}
    >
      <span className="confirm-prompt">{prompt}</span>
      <span className="confirm-actions">
        <button
          type="button"
          className="btn danger-solid"
          autoFocus
          onClick={() => {
            setAsking(false)
            onConfirm()
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="text-btn" onClick={() => setAsking(false)}>
          Keep
        </button>
      </span>
    </span>
  )
}
