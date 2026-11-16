import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base: P = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const PinIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)

export const PersonIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)

export const GroupIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9.5" r="2.4" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M14.5 15.2a4.5 4.5 0 0 1 6 3.8" />
  </svg>
)

export const ArrowLeftIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
)

export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const SearchIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export const TrashIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
)

export const LinkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
)

export const LogoMark = (p: P) => (
  <svg {...base} width={28} height={28} viewBox="0 0 32 32" strokeWidth={1.8} {...p}>
    <path d="M6 7.5c3-1.5 6.5-1.5 10 1 3.5-2.5 7-2.5 10-1v17c-3-1.5-6.5-1.5-10 1-3.5-2.5-7-2.5-10-1z" />
    <path d="M16 8.5v17" />
    <circle cx="10.5" cy="13" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="21.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="20.5" cy="19.5" r="1.6" fill="currentColor" stroke="none" />
    <path d="M10.5 13 16 15.5l5.5-3.5M16 15.5l4.5 4" strokeWidth={1.2} />
  </svg>
)
