import Link from 'next/link'

export const metadata = {
  title: 'Page not found · JOOLA Pulse',
}

export default function NotFound() {
  return (
    <div
      style={{
        padding: '80px 24px',
        textAlign: 'center',
        maxWidth: 560,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: 'var(--yellow)',
          letterSpacing: '-0.05em',
          lineHeight: 0.9,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginTop: 16,
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}
      >
        That page doesn&apos;t exist
      </h1>
      <p style={{ color: 'var(--fg-3)', marginBottom: 32, lineHeight: 1.5 }}>
        The route you tried isn&apos;t in JOOLA Pulse. Pick a destination below to get back on track.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link href="/overview" className="btn btn-yellow">
          → Overview
        </Link>
        <Link href="/posts" className="btn">
          Instagram Posts
        </Link>
        <Link href="/reddit" className="btn">
          Reddit Intel
        </Link>
        <Link href="/youtube" className="btn">
          YouTube
        </Link>
      </div>
    </div>
  )
}
