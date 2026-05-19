import { supabase } from '@/lib/supabase'
import YoutubeClient from './YoutubeClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JOOLA = '04db8591-37a3-4634-9d11-536975fa6935'

export interface YtChannel {
  id: string
  brand_id: string
  channel_id: string | null
  channel_name: string
  channel_url: string
  region: string | null
  country_code: string | null
  is_primary: boolean
  is_active: boolean
}

export interface YtVideo {
  id: string
  youtube_video_id: string
  channel_id: string | null
  brand_id: string
  title: string
  video_url: string
  thumbnail_url: string | null
  published_at: string | null
  duration_seconds: number | null
  video_type: string | null
  view_count: number | null
  like_count: number | null
  comment_count: number | null
  is_short: boolean
  is_sponsored: boolean | null
}

export interface YtChannelWeekly {
  id: string
  channel_id: string
  brand_id: string
  subscribers: number | null
  total_views: number | null
  total_videos: number | null
  videos_uploaded_this_week: number | null
  avg_views_last_10_videos: number | null
  week_number: number
  year: number
  scraped_at: string
}

export default async function YoutubePage() {
  const [channelRes, videosRes, weeklyRes] = await Promise.all([
    supabase.from('yt_channels').select('*').eq('brand_id', JOOLA).maybeSingle(),
    supabase
      .from('yt_videos')
      .select('id,youtube_video_id,channel_id,brand_id,title,video_url,thumbnail_url,published_at,duration_seconds,video_type,view_count,like_count,comment_count,is_short,is_sponsored')
      .eq('brand_id', JOOLA)
      .order('view_count', { ascending: false }),
    supabase
      .from('yt_channel_weekly')
      .select('*')
      .eq('brand_id', JOOLA)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(12),
  ])

  const channel = (channelRes.data ?? null) as YtChannel | null
  const videos = (videosRes.data ?? []) as YtVideo[]
  const weeklyStats = (weeklyRes.data ?? []) as YtChannelWeekly[]
  const latestWeek = weeklyStats[0] ?? null

  // Fall back to the most recent non-null value per metric.
  // The most recent snapshot may have missing fields if the scrape failed partway through.
  const latestSubscribers = weeklyStats.find(w => w.subscribers != null)?.subscribers ?? null
  const latestTotalVideos = weeklyStats.find(w => w.total_videos != null)?.total_videos ?? null

  const totalViews = videos.reduce((sum, v) => sum + (v.view_count ?? 0), 0)
  const totalLikes = videos.reduce((sum, v) => sum + (v.like_count ?? 0), 0)
  const topVideo = videos[0] ?? null

  return (
    <YoutubeClient
      channel={channel}
      videos={videos}
      weeklyStats={weeklyStats}
      latestWeek={latestWeek}
      latestSubscribers={latestSubscribers}
      latestTotalVideos={latestTotalVideos}
      totalViews={totalViews}
      totalLikes={totalLikes}
      topVideoViews={topVideo?.view_count ?? 0}
    />
  )
}
