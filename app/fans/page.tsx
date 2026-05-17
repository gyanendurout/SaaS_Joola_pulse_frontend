import { supabase } from '@/lib/supabase'
import FansClient from './FansClient'
import type { IgLoyalUser } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FansPage() {
  const { data: users } = await supabase
    .from('joola_ig_loyal_users')
    .select('*')
    .order('ambassador_score', { ascending: false })
    .returns<IgLoyalUser[]>()

  const allUsers = users ?? []

  const superFans = allUsers.filter((u) =>
    (u.loyalty_tier || '').toLowerCase().includes('super')
  ).length
  const regularFans = allUsers.filter((u) =>
    (u.loyalty_tier || '').toLowerCase().includes('regular')
  ).length
  const ambassadorList = allUsers
    .filter((u) => u.is_potential_ambassador)
    .sort((a, b) => (b.ambassador_score || 0) - (a.ambassador_score || 0))

  return (
    <FansClient
      allUsers={allUsers}
      ambassadorList={ambassadorList}
      superFans={superFans}
      regularFans={regularFans}
    />
  )
}
