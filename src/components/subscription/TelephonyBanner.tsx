import { format } from 'date-fns'
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTelephonyStatus } from '@/hooks/useTelephonyBilling'
import { useTelephonySettings } from '@/hooks/useTelephonySettings'

export function TelephonyBanner() {
  const { data: telephonySettings } = useTelephonySettings()
  const { isExpiringSoon, isExpired, daysRemaining, validTill } = useTelephonyStatus()

  if (telephonySettings?.telephony_provider !== 'callerdesk') return null
  if (!isExpiringSoon && !isExpired) return null

  return (
    <div className={`text-white text-sm py-2 px-4 flex items-center
      justify-between flex-wrap gap-2 ${
        isExpired
          ? 'bg-gradient-to-r from-red-500 to-rose-600'
          : 'bg-gradient-to-r from-orange-500 to-amber-500'
      }`}
    >
      <span className="flex items-center gap-2">
        <Phone className="w-4 h-4 shrink-0" />
        {isExpired ? (
          <>Your CallerDesk telephony subscription has <strong>expired</strong>. Subscribe to continue using calls.</>
        ) : (
          <>
            Your CallerDesk telephony subscription expires in{' '}
            <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>
            {validTill && <> on {format(validTill, 'dd MMM yyyy')}</>}.
            {' '}Renew to avoid interruption.
          </>
        )}
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs font-semibold shrink-0"
        onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-credits'))}
      >
        {isExpired ? 'Subscribe Now' : 'Renew Now'}
      </Button>
    </div>
  )
}
