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

/**
 * Canonicalize an athlete name so variants like "benjohns", " Ben Johns ",
 * "BEN JOHNS" all collapse to a single display name "Ben Johns".
 *
 * The Instagram analysis pipeline writes `athletes_shown` with inconsistent
 * spacing/casing (sometimes the IG handle "benjohns", sometimes the full
 * name). Without normalization the Top Athletes leaderboard shows the same
 * person two or three times and the athletes-filter dropdown fails to match
 * across variants.
 *
 * Returns Title Case. For known multi-word names without spaces we restore
 * the space (and special-case "McGuffin"). Unknown names fall back to a
 * generic title-case-by-word transform.
 */
const ATHLETE_NAME_MAP: Record<string, string> = {
  'benjohns': 'Ben Johns',
  'ben johns': 'Ben Johns',
  'tysonmcguffin': 'Tyson McGuffin',
  'tyson mcguffin': 'Tyson McGuffin',
  'annaleighwaters': 'Anna Leigh Waters',
  'anna leigh waters': 'Anna Leigh Waters',
  'collinjohns': 'Collin Johns',
  'collin johns': 'Collin Johns',
  'bobbioshiro': 'Bobbi Oshiro',
  'bobbi oshiro': 'Bobbi Oshiro',
  'jorjajohnson': 'Jorja Johnson',
  'jorja johnson': 'Jorja Johnson',
  'patricksmith': 'Patrick Smith',
  'patrick smith': 'Patrick Smith',
  'annabright': 'Anna Bright',
  'anna bright': 'Anna Bright',
  'brookebuckner': 'Brooke Buckner',
  'brooke buckner': 'Brooke Buckner',
}

export function normalizeAthleteName(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  if (ATHLETE_NAME_MAP[lower]) return ATHLETE_NAME_MAP[lower]
  // Fallback: title-case each whitespace-separated word.
  return lower
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
}
