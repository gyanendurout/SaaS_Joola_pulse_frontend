import { ComingSoonCard } from '@/components/content/ComingSoonCard'

export const dynamic = 'force-static'

export default function ContentReelPage() {
  return (
    <ComingSoonCard
      title="Reel"
      eta="Q4 2026"
      description="Short-form video drafts with storyboard, b-roll selection, caption, and audio cues. Ships with a TikTok preset alongside Reels and Shorts. Coming in Q4 2026."
    />
  )
}
