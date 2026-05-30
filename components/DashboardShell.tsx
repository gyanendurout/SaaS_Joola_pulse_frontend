'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Tip } from '@/components/ui/Tip'

const STORAGE_KEY = 'joola.sidebar.collapsed'
const EXPANDED_KEY = 'joola.sidebar.expanded'

// Inline SVG icon component — no lucide-react dependency
const ICONS: Record<string, string[]> = {
  home:      ["M3 11l9-8 9 8", "M5 10v10h14V10"],
  instagram: ["M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z", "M16 11.5a4 4 0 11-8 0 4 4 0 018 0z", "M17.5 6.5h.01"],
  comments:  ["M21 12a8 8 0 11-3-6.2L21 4l-1 4.5A8 8 0 0121 12z", "M8 11h.01", "M12 11h.01", "M16 11h.01"],
  fans:      ["M16 11a4 4 0 10-8 0 4 4 0 008 0z", "M4 21v-1a6 6 0 0112 0v1", "M16 11h3a3 3 0 013 3v1", "M20 7a3 3 0 11-6 0 3 3 0 016 0z"],
  posts:     ["M9 3h6a2 2 0 012 2v14a2 2 0 01-2 2H9a2 2 0 01-2-2V5a2 2 0 012-2z", "M11 7h2", "M11 11h2", "M11 15h2"],
  complaint: ["M12 3l9 16H3L12 3z", "M12 10v4", "M12 17h.01"],
  search:    ["M11 19a8 8 0 100-16 8 8 0 000 16z", "M21 21l-4.3-4.3"],
  pipeline:  ["M4 12h4", "M16 12h4", "M10 12h4", "M4 6h16", "M4 18h16"],
  chevrons:  ["M11 17l-5-5 5-5", "M18 17l-5-5 5-5"],
  chevdown:  ["M6 9l6 6 6-6"],
  news:      ["M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z", "M7 8h10", "M7 12h10", "M7 16h6"],
  youtube:   ["M21 12a9 9 0 11-18 0 9 9 0 0118 0z", "M10 8l6 4-6 4V8z"],
  star:      ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
  reddit:    ["M21 12a9 9 0 11-18 0 9 9 0 0118 0z", "M8 11h.01", "M16 11h.01", "M9 15s1 1.5 3 1.5 3-1.5 3-1.5"],
  music:     ["M9 17V5l12-2v12", "M9 17a3 3 0 11-6 0 3 3 0 016 0z", "M21 15a3 3 0 11-6 0 3 3 0 016 0z"],
  xmark:     ["M18 6L6 18", "M6 6l12 12"],
  pencil:    ["M12 20h9", "M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"],
  sparkle:   ["M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3z"],
  trending:  ["M22 12h-4l-3 9L9 3l-3 9H2"],
  play:      ["M5 3l14 9-14 9V3z"],
  drafts:    ["M4 4h12l4 4v12H4z", "M16 4v4h4", "M8 13h8", "M8 17h5"],
}

function Ic({ paths, size = 16 }: { paths: string[]; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="ic"
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

interface NavItem {
  id: string
  label: string
  icon: string
  href?: string
  badge?: string
  children?: NavItem[]
}

const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'INTELLIGENCE',
    items: [
      { id: 'overview',       label: 'Overview',           icon: 'home',      href: '/overview',     badge: 'LIVE' },
      { id: 'weekly-digest',  label: 'Weekly Digest',      icon: 'posts',     href: '/weekly-digest' },
      { id: 'products',       label: 'Paddle Intel',       icon: 'sparkle',   href: '/products' },
      { id: 'trends',         label: 'Trends',             icon: 'trending',  href: '/trends' },
    ],
  },
  {
    section: 'SOCIAL MEDIA',
    items: [
      {
        id: 'instagram', label: 'Instagram', icon: 'instagram',
        children: [
          { id: 'ig-posts',      label: 'Posts & Cadence',    icon: 'posts',     href: '/posts' },
          { id: 'ig-comments',   label: 'Comment Intel',      icon: 'comments',  href: '/comments' },
          { id: 'ig-fans',       label: 'Fans & Ambassadors', icon: 'fans',      href: '/fans' },
          { id: 'ig-complaints', label: 'Complaints',         icon: 'complaint', href: '/complaints' },
        ],
      },
      { id: 'youtube',      label: 'YouTube',     icon: 'youtube',  href: '/youtube' },
      { id: 'tiktok',       label: 'TikTok',      icon: 'music',    href: '/tiktok' },
      { id: 'twitter',      label: 'X / Twitter', icon: 'xmark',    href: '/twitter' },
      { id: 'reddit',       label: 'Reddit',      icon: 'reddit',   href: '/reddit' },
      { id: 'influencers',  label: 'Influencers', icon: 'star',     href: '/influencers' },
    ],
  },
  {
    section: 'SEO',
    items: [
      { id: 'seo-analyze',    label: 'Run Analysis',       icon: 'pipeline',  href: '/seo-analyze' },
      { id: 'seo-dashboard',  label: 'Search Health',      icon: 'search',    href: '/seo-dashboard' },
    ],
  },
  {
    section: 'NEWS',
    items: [
      { id: 'seo-news',       label: 'In News',            icon: 'news',      href: '/seo-news' },
    ],
  },
]

function getNow() {
  return new Date().toLocaleString('en-US', {
    weekday: 'short', hour: 'numeric', minute: '2-digit',
    timeZone: 'Asia/Kolkata', hour12: true,
  }) + ' IST'
}

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href && (pathname === item.href || pathname.startsWith(item.href + '/'))) return true
  if (item.children) return item.children.some(c => isItemActive(c, pathname))
  return false
}

export default function DashboardShell({
  children,
  draftCount: draftCountProp,
}: {
  children: React.ReactNode
  draftCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [nowStr, setNowStr] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [fetchedCount, setFetchedCount] = useState<number | null>(null)
  const draftCount = draftCountProp ?? fetchedCount ?? 0

  useEffect(() => {
    if (draftCountProp !== undefined) return
    const ac = new AbortController()
    fetch('/seo-api/content/drafts?limit=1', { signal: ac.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j && typeof j.total === 'number') setFetchedCount(j.total)
      })
      .catch(() => { /* ignore */ })
    return () => ac.abort()
  }, [draftCountProp, pathname])

  // Compute which parents should auto-expand based on active route
  const autoExpandIds = useMemo(() => {
    const ids = new Set<string>()
    for (const group of NAV) {
      for (const item of group.items) {
        if (item.children && item.children.some(c => isItemActive(c, pathname))) {
          ids.add(item.id)
        }
      }
    }
    return ids
  }, [pathname])

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    const raw = localStorage.getItem(EXPANDED_KEY)
    let stored: string[] = []
    if (raw) {
      try { stored = JSON.parse(raw) } catch { stored = [] }
    } else {
      // First load — default-expand Instagram
      stored = ['instagram']
    }
    setExpanded(new Set([...stored, ...Array.from(autoExpandIds)]))
    setNowStr(getNow())
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-expand parents whose children become active (e.g. user navigates)
  useEffect(() => {
    if (!hydrated) return
    if (autoExpandIds.size === 0) return
    setExpanded(prev => {
      const next = new Set(prev)
      let changed = false
      autoExpandIds.forEach(id => { if (!next.has(id)) { next.add(id); changed = true } })
      return changed ? next : prev
    })
  }, [autoExpandIds, hydrated])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed, hydrated])

  useEffect(() => {
    if (hydrated) localStorage.setItem(EXPANDED_KEY, JSON.stringify(Array.from(expanded)))
  }, [expanded, hydrated])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const sidebarCls = 'sidebar' + (collapsed ? ' collapsed' : '')
  const mainCls = 'main' + (collapsed ? ' collapsed' : '')

  const renderItem = (item: NavItem, isChild = false) => {
    const isActive = isItemActive(item, pathname)
    const hasChildren = !!item.children && item.children.length > 0
    const isExpanded = expanded.has(item.id)

    // Parent with children (no href) — render as expander button.
    // When sidebar is collapsed (icon-only mode), the expand toggle is meaningless;
    // navigate to the parent's first child route instead so the click does something visible.
    const onParentClick = () => {
      if (collapsed) {
        const firstChildHref = item.children?.find(c => c.href)?.href
        if (firstChildHref) router.push(firstChildHref)
        else toggleExpand(item.id)
      } else {
        toggleExpand(item.id)
      }
    }

    if (hasChildren && !item.href) {
      return (
        <div key={item.id}>
          <button
            type="button"
            onClick={onParentClick}
            title={collapsed ? `${item.label} →` : undefined}
            className={'nav-item' + (isActive ? ' active' : '')}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <Ic paths={ICONS[item.icon] ?? []} size={16} />
            <span className="ni-label">{item.label}</span>
            {item.badge && <span className="ni-badge">{item.badge}</span>}
            {!collapsed && (
              <span
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'transform 0.18s',
                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                  color: 'var(--fg-4)',
                }}
              >
                <Ic paths={ICONS.chevdown} size={12} />
              </span>
            )}
          </button>
          {/* Children — only when sidebar expanded AND group expanded */}
          {!collapsed && isExpanded && (
            <div style={{ marginLeft: 0, marginTop: 2, marginBottom: 4 }}>
              {item.children!.map(child => renderItem(child, true))}
            </div>
          )}
        </div>
      )
    }

    // Leaf item — render as Link
    return (
      <Link
        key={item.id}
        href={item.href!}
        className={'nav-item' + (isActive ? ' active' : '')}
        style={isChild && !collapsed ? {
          paddingLeft: 28,
          fontSize: 12.5,
          position: 'relative',
        } : undefined}
      >
        {isChild && !collapsed && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 18,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: isActive ? 'var(--yellow)' : 'var(--fg-4)',
              opacity: isActive ? 1 : 0.5,
            }}
          />
        )}
        {(!isChild || collapsed) && <Ic paths={ICONS[item.icon] ?? []} size={isChild ? 14 : 16} />}
        <span className="ni-label">{item.label}</span>
        {item.badge && <span className="ni-badge">{item.badge}</span>}
      </Link>
    )
  }

  return (
    <>
      <div className="app-bg" />
      <div className="dot-grid" />
      <div className="shell">
        <aside className={sidebarCls}>
          {/* Brand */}
          <div className="brand">
            <div className="brand-mark">J</div>
            <div className="brand-text">
              <div className="brand-wordmark">JOOLA <em>PULSE</em></div>
              <div className="brand-tag">Own-brand intelligence</div>
            </div>
          </div>

          {/* Nav */}
          <div className="nav-section">
            {NAV.map(group => (
              <div className="nav-group" key={group.section}>
                <span className="nav-label">{group.section}</span>
                {group.items.map(item => renderItem(item))}
              </div>
            ))}

            {/* CONTENT GENERATION (special — has disabled items, BETA badge, Tips) */}
            {!collapsed && <div className="divider" style={{ margin: '12px 14px' }} />}
            <div className="nav-group">
              <span
                className="nav-label"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                }}
              >
                <span>CONTENT GENERATION</span>
                {!collapsed && (
                  <span
                    className="pill pill-yellow"
                    style={{ fontSize: 8, padding: '2px 6px', letterSpacing: '0.08em' }}
                  >
                    BETA
                  </span>
                )}
              </span>

              {/* Text — active link */}
              <Link
                href="/content-generation/text"
                className={
                  'nav-item' +
                  (pathname === '/content-generation/text' ||
                  pathname.startsWith('/content-generation/text/')
                    ? ' active'
                    : '')
                }
              >
                <Ic paths={ICONS.pencil} size={16} />
                <span className="ni-label">Text</span>
              </Link>

              {/* Image — disabled */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  className="nav-item"
                  aria-disabled
                  style={{
                    opacity: 0.45,
                    pointerEvents: 'none',
                    flex: 1,
                    cursor: 'not-allowed',
                  }}
                >
                  <Ic paths={ICONS.sparkle} size={16} />
                  <span className="ni-label">Image</span>
                  {!collapsed && (
                    <span
                      className="pill pill-ghost"
                      style={{
                        marginLeft: 'auto',
                        fontSize: 8,
                        padding: '2px 6px',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Soon
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'auto',
                    }}
                  >
                    <Tip text="Image generation arrives Q3 2026" placement="right" />
                  </span>
                )}
              </div>

              {/* Reel — disabled */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  className="nav-item"
                  aria-disabled
                  style={{
                    opacity: 0.45,
                    pointerEvents: 'none',
                    flex: 1,
                    cursor: 'not-allowed',
                  }}
                >
                  <Ic paths={ICONS.play} size={16} />
                  <span className="ni-label">Reel</span>
                  {!collapsed && (
                    <span
                      className="pill pill-ghost"
                      style={{
                        marginLeft: 'auto',
                        fontSize: 8,
                        padding: '2px 6px',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Soon
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'auto',
                    }}
                  >
                    <Tip text="Reel generation arrives Q4 2026" placement="right" />
                  </span>
                )}
              </div>

              {/* Drafts — sub-link with count badge */}
              <Link
                href="/content-generation"
                className={
                  'nav-item' +
                  (pathname === '/content-generation' ? ' active' : '')
                }
                style={
                  !collapsed
                    ? {
                        paddingLeft: 28,
                        fontSize: 12.5,
                        position: 'relative',
                      }
                    : undefined
                }
              >
                {!collapsed && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 18,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background:
                        pathname === '/content-generation'
                          ? 'var(--yellow)'
                          : 'var(--fg-4)',
                      opacity: pathname === '/content-generation' ? 1 : 0.5,
                    }}
                  />
                )}
                {collapsed && <Ic paths={ICONS.drafts} size={14} />}
                <span className="ni-label">Studio</span>
                <span
                  className="ni-badge"
                  style={{
                    marginLeft: 'auto',
                    background: 'var(--bg-3)',
                    color: 'var(--fg-3)',
                    border: '1px solid var(--line)',
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  {draftCount}
                </span>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="sidebar-foot">
            <span className="live-pulse-dot" />
            {!collapsed && <span>Live · {nowStr}</span>}
            <button
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--fg-4)', padding: 4,
                display: 'flex', alignItems: 'center', flexShrink: 0,
              }}
            >
              <Ic paths={ICONS.chevrons} size={14} />
            </button>
          </div>
        </aside>

        <main className={mainCls}>
          <div className="main-inner" key={pathname}>
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
