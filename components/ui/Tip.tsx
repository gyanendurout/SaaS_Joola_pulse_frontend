'use client'

import { useState } from 'react'

interface Props {
  text: string
  size?: number
  placement?: 'bottom' | 'top' | 'right'
}

export function Tip({ text, size = 13, placement = 'bottom' }: Props) {
  const [show, setShow] = useState(false)

  const offsetStyle: React.CSSProperties =
    placement === 'top'
      ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 }
      : placement === 'right'
      ? { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 }
      : { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 }

  return (
    <span
      className="tip-wrap"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
      }}
    >
      <span
        className="tip-icon"
        role="button"
        tabIndex={0}
        aria-label={`Info: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={e => {
          e.stopPropagation()
          setShow(s => !s)
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '50%',
          background: show ? 'rgba(245, 230, 37, 0.16)' : 'rgba(255,255,255,0.04)',
          border: show ? '1px solid var(--yellow-edge)' : '1px solid rgba(255,255,255,0.18)',
          color: show ? 'var(--yellow)' : 'var(--fg-3)',
          cursor: 'help',
          marginLeft: 5,
          flexShrink: 0,
          fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
          userSelect: 'none',
          letterSpacing: 0,
        }}
      >
        <svg
          aria-hidden="true"
          width={Math.max(size - 4, 9)}
          height={Math.max(size - 4, 9)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </span>
      {show && (
        <span
          style={{
            position: 'absolute',
            ...offsetStyle,
            background: '#0e0e10',
            border: '1px solid var(--bg-3)',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            width: 'max-content',
            maxWidth: 280,
            color: 'var(--fg-2)',
            zIndex: 1000,
            pointerEvents: 'none',
            fontWeight: 400,
            lineHeight: 1.5,
            textTransform: 'none',
            letterSpacing: 'normal',
            textAlign: 'left',
            whiteSpace: 'normal',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            fontStyle: 'normal',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
