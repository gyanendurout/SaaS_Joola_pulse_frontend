'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'joola.sidebar.collapsed'

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
  news:      ["M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z", "M7 8h10", "M7 12h10", "M7 16h6"],
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
  href: string
  badge?: string
}

const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'INTELLIGENCE',
    items: [
      { id: 'overview',       label: 'Overview',           icon: 'home',      href: '/overview',     badge: 'LIVE' },
      { id: 'weekly-digest',  label: 'Weekly Digest',      icon: 'posts',     href: '/weekly-digest' },
    ],
  },
  {
    section: 'INSTAGRAM',
    items: [
      { id: 'posts',          label: 'Posts & Cadence',    icon: 'posts',     href: '/posts' },
      { id: 'comments',       label: 'Comment Intel',      icon: 'comments',  href: '/comments' },
      { id: 'fans',           label: 'Fans & Ambassadors', icon: 'fans',      href: '/fans' },
      { id: 'complaints',     label: 'Complaints',         icon: 'complaint', href: '/complaints' },
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
    weekday: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata', hour12: false,
  }) + ' IST'
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [nowStr, setNowStr] = useState('')

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    setNowStr(getNow())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed, hydrated])

  const sidebarCls = 'sidebar' + (collapsed ? ' collapsed' : '')
  const mainCls = 'main' + (collapsed ? ' collapsed' : '')

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
                {group.items.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={'nav-item' + (isActive ? ' active' : '')}
                    >
                      <Ic paths={ICONS[item.icon] ?? []} size={16} />
                      <span className="ni-label">{item.label}</span>
                      {item.badge && <span className="ni-badge">{item.badge}</span>}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="sidebar-foot">
            <span className="live-pulse-dot" />
            {!collapsed && <span>Live · {nowStr}</span>}
            <button
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
          <div className="main-inner">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
