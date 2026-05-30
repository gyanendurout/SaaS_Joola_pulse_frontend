'use client'
import { useRef, useState, useEffect } from 'react'

export function usePagedRows<T>(rows: T[], pageSize = 50) {
  const [limit, setLimit] = useState(pageSize)
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sentinelRef = useRef<any>(null)

  // Reset when source rows change (filter or sort applied)
  useEffect(() => {
    setLimit(pageSize)
  }, [rows, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  // Observe sentinel within the scroll container to load more rows
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || limit >= rows.length) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLimit(prev => Math.min(prev + pageSize, rows.length))
        }
      },
      { root: containerRef.current, threshold: 0 }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [limit, rows.length, pageSize])

  const shown = Math.min(limit, rows.length)
  return {
    visibleRows: rows.slice(0, shown),
    containerRef,
    sentinelRef,
    hasMore: limit < rows.length,
    total: rows.length,
    shown,
  }
}
