import { LINK_KIND_IDS, type LinkKind } from '../types'

/** Ink styles for a character's avatar (see .mark-* in index.css). */
export const NODE_MARKS = ['solid', 'outline', 'dots', 'stripes', 'hatch', 'half']

/** Fill styles for a group's outline on the web (see GroupOutlines). */
export const GROUP_STYLES = ['soft', 'hatch', 'dots', 'grid']

/** Patterns for book covers (see .pattern-* in index.css). */
export const BOOK_PATTERNS = ['ink', 'stripes', 'dots', 'checks', 'waves', 'grid']

/**
 * Everything is black and white, so connection types are told apart by line style.
 * `dash` is an SVG stroke-dasharray; round caps turn short dashes into dots.
 */
export const LINK_KINDS: Record<LinkKind, { label: string; dash?: string; width: number }> = {
  family: { label: 'Family', width: 3 },
  romance: { label: 'Romance', dash: '0.5 7', width: 3.5 },
  friend: { label: 'Friends', width: 1.6 },
  ally: { label: 'Allies', dash: '9 6', width: 2 },
  mentor: { label: 'Mentor', dash: '14 5 1 5', width: 2 },
  work: { label: 'Work', dash: '4 5', width: 1.6 },
  rival: { label: 'Rivals', dash: '16 7', width: 2.4 },
  enemy: { label: 'Enemies', dash: '2 5 10 5', width: 2.6 },
  place: { label: 'Place', dash: '0.5 5', width: 2 },
  other: { label: 'Other', dash: '6 6', width: 1.4 },
}

export const LINK_KIND_ORDER: LinkKind[] = [...LINK_KIND_IDS]
