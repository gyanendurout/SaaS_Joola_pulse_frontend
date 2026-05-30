'use client'
import { useEffect, useMemo, useState } from 'react'
import { SortableTh } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'

interface Narrative {
  week_start: string
  title: string
  body: string
  key_points: string[]
}

interface CompositeScore {
  week_start: string
  attention_score: number
  sales_likelihood_score: number
  ai_narrative: string | null
}

// BUG 2 fix: gpt-4o sometimes returns JSON wrapped in ```json...``` fences.
// This strips fences and re-parses so title/key_points render properly.
function parseNarrativeBody(raw: Narrative | null): Narrative | null {
  if (!raw?.body) return raw
  const b = raw.body.trim()
  if (!b.startsWith('{') && !b.startsWith('`')) return raw
  try {
    const stripped = b.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(stripped)
    return {
      ...raw,
      title: parsed.title ?? raw.title,
      body: parsed.body ?? raw.body,
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : raw.key_points,
    }
  } catch {
    return raw
  }
}

export default function AnalyticsInsights() {
  const [narrative, setNarrative] = useState<Narrative | null>(null)
  const [scores, setScores] = useState<CompositeScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [scoreSort, setScoreSort] = useState<{ key: 'week_start' | 'attention_score' | 'sales_likelihood_score'; dir: 'asc' | 'desc' }>({ key: 'week_start', dir: 'desc' })

  useEffect(() => {
    Promise.all([
      fetch('/analytics-api/api/narrative?narrative_type=weekly_summary').then(r => r.json()),
      fetch('/analytics-api/api/composite-scores?weeks=8').then(r => r.json()),
    ]).then(([narrativeRes, scoresRes]) => {
      setNarrative(parseNarrativeBody(narrativeRes.data?.[0] ?? null))
      setScores(scoresRes.data ?? [])
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [])

  const sortedScores = useMemo(() => {
    return [...scores].sort((a, b) => {
      const v = scoreSort.key === 'week_start'
        ? a.week_start.localeCompare(b.week_start)
        : a[scoreSort.key] - b[scoreSort.key]
      return scoreSort.dir === 'asc' ? v : -v
    })
  }, [scores, scoreSort])

  if (loading) return (
    <div className="card card-pad-lg">
      <div className="empty">Loading AI insights…</div>
    </div>
  )

  if (error) return (
    <div className="card card-pad-lg">
      <div className="empty">Analytics backend offline — start the analytics service on port 8001.</div>
    </div>
  )

  return (
    <div className="card card-pad-lg">
      <div className="card-head">
        <span>AI Intelligence Digest</span>
        {narrative && (
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{narrative.week_start}</span>
        )}
      </div>

      {narrative ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--yellow)' }}>
            {narrative.title}
          </div>
          <p style={{ color: 'var(--text)', lineHeight: 1.6, marginBottom: 12 }}>
            {narrative.body}
          </p>
          {narrative.key_points?.length > 0 && (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {narrative.key_points.map((pt, i) => (
                <li key={i} style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 4 }}>
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="empty" style={{ marginBottom: 16 }}>
          No AI narrative yet — analytics pipeline running…
        </div>
      )}

      {scores.length > 0 && (
        <>
          <div style={{
            fontWeight: 600, marginBottom: 10, fontSize: 13,
            color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>
            Composite Scores (last 8 weeks)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <SortableTh
                    active={scoreSort.key === 'week_start'}
                    direction={scoreSort.dir}
                    onClick={() => setScoreSort(s => ({ key: 'week_start', dir: s.key === 'week_start' && s.dir === 'desc' ? 'asc' : 'desc' }))}
                  >
                    Week <Tip text="The Monday that starts each analytics week. Data covers the 7 days from this date." placement="bottom" />
                  </SortableTh>
                  <SortableTh
                    active={scoreSort.key === 'attention_score'}
                    direction={scoreSort.dir}
                    num
                    onClick={() => setScoreSort(s => ({ key: 'attention_score', dir: s.key === 'attention_score' && s.dir === 'desc' ? 'asc' : 'desc' }))}
                  >
                    Attention <Tip text="Composite attention score (0–100). Weighted average of cross-platform views, mentions, and engagement for the week. Higher = more eyes on JOOLA." placement="bottom" />
                  </SortableTh>
                  <SortableTh
                    active={scoreSort.key === 'sales_likelihood_score'}
                    direction={scoreSort.dir}
                    num
                    onClick={() => setScoreSort(s => ({ key: 'sales_likelihood_score', dir: s.key === 'sales_likelihood_score' && s.dir === 'desc' ? 'asc' : 'desc' }))}
                  >
                    Sales Signal <Tip text="Sales likelihood score (0–100). Combines purchase intent signals, positive sentiment ratio, and opportunity flags from TikTok and Reddit. Higher = stronger buy intent." placement="bottom" />
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sortedScores.map(s => (
                  <tr key={s.week_start}>
                    <td>{s.week_start}</td>
                    <td className="cell-num">
                      <span style={{
                        color: s.attention_score > 60
                          ? 'var(--joola)'
                          : s.attention_score > 30
                            ? 'var(--yellow)'
                            : 'var(--muted)'
                      }}>
                        {s.attention_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="cell-num">
                      <span style={{
                        color: s.sales_likelihood_score > 60
                          ? 'var(--joola)'
                          : s.sales_likelihood_score > 30
                            ? 'var(--yellow)'
                            : 'var(--muted)'
                      }}>
                        {s.sales_likelihood_score.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
