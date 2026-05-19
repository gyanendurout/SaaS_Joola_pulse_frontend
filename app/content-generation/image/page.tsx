import { ComingSoonCard } from '@/components/content/ComingSoonCard'

export const dynamic = 'force-static'

export default function ContentImagePage() {
  return (
    <ComingSoonCard
      title="Image"
      eta="Q3 2026"
      description="On-brand Instagram, story, and ad images from a single prompt plus a product reference. Includes athlete-likeness controls and brand palette enforcement. Coming in Q3 2026."
    />
  )
}
