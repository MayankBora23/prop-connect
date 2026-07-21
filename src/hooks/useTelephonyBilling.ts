import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { getCompanyId } from '@/lib/getCompanyId'
import { useCurrentCompany } from '@/hooks/useCompany'

export type TelephonySubscription = {
  id: string
  company_id: string
  users_count: number
  amount_paid: number
  valid_from: string
  valid_till: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  status: string
  created_at: string
}

export function useTelephonyBilling() {
  const { data: company } = useCurrentCompany()
  const companyId = company?.id

  return useQuery({
    queryKey: ['telephony-billing', companyId],
    enabled: !!companyId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TelephonySubscription | null> => {
      const companyId = await getCompanyId()
      if (!companyId) return null
      const { data, error } = await (supabase as any)
        .from('company_telephony_subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as TelephonySubscription | null
    },
  })
}

export function useTelephonyStatus() {
  const { data: sub, isLoading, refetch } = useTelephonyBilling()

  const now = new Date()
  const validTill = sub?.valid_till ? new Date(sub.valid_till) : null

  function toISTMidnight(date: Date): Date {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    ist.setHours(0, 0, 0, 0)
    return ist
  }

  const daysRemaining = validTill
    ? Math.round(
        (toISTMidnight(validTill).getTime() - toISTMidnight(now).getTime()) / 86400000
      )
    : null

  const isActive = !!sub && !!validTill && validTill > now
  const isExpired = !!sub && !!validTill && validTill <= now
  const isExpiringSoon = isActive && daysRemaining !== null && daysRemaining <= 7
  const hasNeverSubscribed = !sub

  return {
    sub,
    isLoading,
    refetch,
    isActive,
    isExpired,
    isExpiringSoon,
    hasNeverSubscribed,
    daysRemaining,
    validTill,
  }
}
