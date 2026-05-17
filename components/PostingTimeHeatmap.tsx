'use client'

import React from 'react'

interface HeatmapCell {
  day: string
  hour: number
  postCount: number
  avgEngagement: number
}

interface PostingTimeHeatmapProps {
  data: HeatmapCell[]
  title?: string
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

function colorFor(v: number, max: number): string {
  const t = Math.min(1, Math.max(0, v / (max || 1)))
  if (t < 0.06) return 'rgba(255,255,255,0.04)'
  const a = 0.1 + t * 0.85
  return `rgba(245,230,37,${a.toFixed(3)})`
}

export default function PostingTimeHeatmap({ data }: PostingTimeHeatmapProps) {
  const byKey = new Map(data.map((d) => [`${d.day}-${d.hour}`, d]))
  const maxEng = data.reduce((m, d) => Math.max(m, d.avgEngagement), 0)

  const bestCell = [...data]
    .filter((d) => d.postCount >= 2)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)[0]

  const hours = Array.from({ length: 24 }, (_, h) => h)

  return (
    <div className="heatmap-wrap">
      <div className="heatmap" style={{ gridTemplateColumns: '30px repeat(24, 1fr)' }}>
        <div />
        {hours.map((h) => (
          <div className="h-col-lbl" key={h}>{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</div>
        ))}
        {DAY_ORDER.map((day) => (
          <React.Fragment key={day}>
            <div className="h-row-lbl">{DAY_SHORT[day]}</div>
            {hours.map((h) => {
              const cell = byKey.get(`${day}-${h}`)
              const v = cell ? cell.avgEngagement : 0
              return (
                <div
                  className="h-cell"
                  key={h}
                  style={{ background: colorFor(v, maxEng) }}
                  title={cell
                    ? `${DAY_SHORT[day]} ${String(h).padStart(2, '0')}:00 — ${(v * 100).toFixed(2)}% avg ER`
                    : `${DAY_SHORT[day]} ${String(h).padStart(2, '0')}:00 — no data`}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
      {bestCell && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--fg-3)' }}>
          Best window:{' '}
          <span className="mono" style={{ color: 'var(--yellow)', fontWeight: 700 }}>
            {DAY_SHORT[bestCell.day]} {String(bestCell.hour).padStart(2, '0')}:00
            · {(bestCell.avgEngagement * 100).toFixed(2)}% ER
          </span>
        </div>
      )}
    </div>
  )
}
