'use client'

type DayData = {
  date: string
  avgEngagement: number
  postCount: number
}

interface ContentCalendarProps {
  title?: string
  data: DayData[]
}

const NUM_WEEKS = 26

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function colorFor(v: number, max: number): string {
  if (v <= 0.05) return 'rgba(255,255,255,0.04)'
  const t = Math.min(1, v / (max || 1))
  const a = 0.18 + t * 0.78
  return `rgba(34,197,94,${a.toFixed(3)})`
}

export default function ContentCalendar({ data }: ContentCalendarProps) {
  const dataMap = new Map(data.map((d) => [d.date, d]))
  const maxEng = Math.max(...data.map((d) => d.avgEngagement), 0.01)

  const today = new Date()
  const dow = today.getDay()
  const toMon = dow === 0 ? 6 : dow - 1
  const lastMon = new Date(today)
  lastMon.setDate(today.getDate() - toMon)

  const start = new Date(lastMon)
  start.setDate(lastMon.getDate() - (NUM_WEEKS - 1) * 7)

  const weeks: Date[][] = Array.from({ length: NUM_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (__, d) => {
      const dt = new Date(start)
      dt.setDate(start.getDate() + w * 7 + d)
      return dt
    })
  )

  return (
    <div className="cal-wrap">
      <div className="calendar">
        {weeks.map((week, wi) => (
          <div className="cal-col" key={wi}>
            {week.map((dt, di) => {
              const iso = fmtDate(dt)
              const isFuture = dt > today
              if (isFuture) return <div className="cal-cell" key={di} style={{ background: 'transparent' }} />
              const entry = dataMap.get(iso)
              const v = entry ? entry.avgEngagement : 0
              return (
                <div
                  className="cal-cell"
                  key={di}
                  style={{ background: colorFor(v, maxEng) }}
                  title={entry
                    ? `${iso}: ${entry.postCount} post${entry.postCount !== 1 ? 's' : ''}, avg ${(entry.avgEngagement * 100).toFixed(2)}%`
                    : `${iso}: no posts`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
