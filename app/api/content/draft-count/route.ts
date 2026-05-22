import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { count, error } = await supabase
      .from('content_drafts')
      .select('*', { count: 'exact', head: true })

    if (error) return NextResponse.json({ total: 0 })
    return NextResponse.json({ total: count ?? 0 })
  } catch {
    return NextResponse.json({ total: 0 })
  }
}
