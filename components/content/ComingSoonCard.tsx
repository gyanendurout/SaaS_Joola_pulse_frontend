'use client'

import Link from 'next/link'

interface Props {
  title: string
  eta: string
  description: string
}

export function ComingSoonCard({ title, eta, description }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <div
        className="card card-pad-lg"
        style={{
          maxWidth: 560,
          width: '100%',
          textAlign: 'center',
          padding: '48px 32px',
        }}
      >
        <div
          style={{
            fontFamily: "'Archivo Black', 'Archivo', sans-serif",
            fontSize: 44,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            marginBottom: 14,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        <div style={{ marginBottom: 22 }}>
          <span className="pill pill-yellow" style={{ fontSize: 11, padding: '5px 12px' }}>
            ETA · {eta}
          </span>
        </div>
        <p
          style={{
            color: 'var(--fg-3)',
            fontSize: 14,
            lineHeight: 1.6,
            margin: '0 auto 28px',
            maxWidth: 440,
          }}
        >
          {description}
        </p>
        <div style={{ display: 'inline-flex', gap: 10 }}>
          <Link href="/content-generation" className="btn">
            ← Back to Content Studio
          </Link>
          <Link href="/content-generation/text" className="btn btn-yellow">
            Try Text generator
          </Link>
        </div>
      </div>
    </div>
  )
}
