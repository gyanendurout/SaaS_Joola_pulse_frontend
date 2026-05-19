/**
 * Format a raw enum string (e.g. "very_negative", "SUPER_FAN") into a
 * human-readable Title Case label: "Very Negative", "Super Fan".
 *
 * Returns the em-dash for null/empty input so callers can drop it straight
 * into a table cell.
 */
export function formatEnum(value: string | null | undefined): string {
  if (!value) return '—'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Map a sentiment value (which may be a label like "very_positive" or a
 * numeric score) to a colour token. Returns CSS variable strings.
 */
export function sentimentColor(s: string | null | undefined): string {
  if (!s) return 'var(--fg-4)'
  const low = s.toLowerCase()
  if (low.includes('positive')) return 'var(--joola)'
  if (low.includes('negative')) return '#f87171'
  return 'var(--fg-3)'
}
