import type { ReactNode } from 'react'
import { useLibrary } from '../store/library'
import { SpiralLogo } from './Doodles'

const STATUS_TEXT = {
  saved: 'All saved',
  saving: 'Saving…',
  offline: 'Offline · retrying',
} as const

export function TopNav({ children, title }: { children?: ReactNode; title?: ReactNode }) {
  const { saveStatus } = useLibrary()
  return (
    <header className="topnav">
      <a href="#/" className="logo" title="Back to your shelf">
        <SpiralLogo width={30} height={30} />
        <span>Storyweb</span>
      </a>
      {title}
      <span className={`save-badge is-${saveStatus}`} role="status">
        <span className="save-dot" />
        {STATUS_TEXT[saveStatus]}
      </span>
      <nav className="nav-links">{children}</nav>
    </header>
  )
}
