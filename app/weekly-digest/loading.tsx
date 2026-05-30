export default function WeeklyDigestLoading() {
  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            JOOLA PULSE · WEEKLY REPORT
          </div>
          <h1>WEEKLY <em>DIGEST</em></h1>
          <div className="sub">Loading weekly data…</div>
        </div>
      </header>
      <div className="empty" style={{ marginTop: 48, fontSize: 13 }}>
        Fetching snapshots and post data…
      </div>
    </div>
  )
}
