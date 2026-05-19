'use client'

import { useState } from 'react'

interface Props {
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
  num?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
  title?: string
}

function SortChev({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  const ascActive = active && direction === 'asc'
  const descActive = active && direction === 'desc'
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 1,
        marginLeft: 4,
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <svg width="8" height="5" viewBox="0 0 8 5" style={{ display: 'block' }}>
        <path
          d="M1 4L4 1L7 4"
          stroke={ascActive ? 'var(--yellow)' : 'currentColor'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={ascActive ? 1 : active ? 0.18 : 0.32}
        />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" style={{ display: 'block' }}>
        <path
          d="M1 1L4 4L7 1"
          stroke={descActive ? 'var(--yellow)' : 'currentColor'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={descActive ? 1 : active ? 0.18 : 0.32}
        />
      </svg>
    </span>
  )
}

export function SortableTh({ active, direction, onClick, num, children, style, title }: Props) {
  const [hover, setHover] = useState(false)
  return (
    <th
      className={num ? 'num' : undefined}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        background: hover ? 'color-mix(in srgb, var(--yellow) 6%, transparent)' : undefined,
        transition: 'background 0.12s',
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          justifyContent: num ? 'flex-end' : 'flex-start',
          color: active ? 'var(--yellow)' : undefined,
          transition: 'color 0.12s',
        }}
      >
        {children}
        <SortChev active={active} direction={direction} />
      </span>
    </th>
  )
}

interface ExtLinkProps {
  href: string | null | undefined
  label?: string
  size?: number
}

export function ExtLink({ href, label = 'Open source', size = 14 }: ExtLinkProps) {
  const [hover, setHover] = useState(false)
  if (!href) return <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>—</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 6,
        color: hover ? 'var(--yellow)' : 'var(--fg-3)',
        background: hover ? 'color-mix(in srgb, var(--yellow) 12%, var(--bg-3))' : 'var(--bg-3)',
        textDecoration: 'none',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
        <path d="M15 3h6v6" />
        <path d="M10 14L21 3" />
      </svg>
    </a>
  )
}
