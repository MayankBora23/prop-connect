import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Phone, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTelephonyStatus } from '@/hooks/useTelephonyBilling'
import { useTelephonySettings } from '@/hooks/useTelephonySettings'
import { useCurrentCompany } from '@/hooks/useCompany'
import { useCurrentProfile } from '@/hooks/useProfiles'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

type RazorpayPaymentFailed = {
  error?: {
    description?: string;
    reason?: string;
    code?: string;
  };
};

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayPaymentFailed) => void) => void;
}

type RazorpayCheckout = new (options: Record<string, unknown>) => RazorpayInstance;

function getRazorpay(): RazorpayCheckout {
  const ctor = (window as unknown as { Razorpay?: RazorpayCheckout }).Razorpay;
  if (!ctor) throw new Error('Razorpay SDK not loaded');
  return ctor;
}

function razorpayFailureMessage(response: RazorpayPaymentFailed): string {
  const desc = response.error?.description?.trim();
  if (desc) return desc;
  const reason = response.error?.reason?.trim();
  if (reason) return reason;
  return 'Payment failed. Please try again.';
}

type PayStatus = 'idle' | 'creating' | 'open' | 'verifying' | 'success' | 'failed'

export function TelephonyBillingCard() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()
  const { data: telephonySettings } = useTelephonySettings()
  const {
    sub, isActive, isExpired, isExpiringSoon,
    hasNeverSubscribed, daysRemaining, validTill, refetch
  } = useTelephonyStatus()
  const { data: profile } = useCurrentProfile()

  const [usersCount, setUsersCount] = useState<number>(
    Math.max(2, sub?.users_count ?? 2)
  )
  const [payStatus, setPayStatus] = useState<PayStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Only show for CallerDesk provider (Twilio uses per-minute wallet debits instead)
  if (telephonySettings?.telephony_provider !== 'callerdesk') return null

  const quarterlyAmount = useMemo(() => usersCount * 3000, [usersCount])
  const showPaySection = isExpired || isExpiringSoon || hasNeverSubscribed

  const handlePay = async () => {
    if (!company?.id || usersCount < 2) return
    setPayStatus('creating')
    setErrorMsg(null)

    try {
      const { data: order, error } = await supabase.functions.invoke(
        'create-telephony-order',
        { body: { company_id: company.id, users_count: usersCount } }
      )
      if (error) throw new Error(error.message)

      // Load Razorpay script (copy exact pattern from RechargeDialog.tsx)
      if (!(window as unknown as { Razorpay?: unknown }).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Razorpay'))
          document.head.appendChild(script)
        })
      }

      const { data: { session } } = await supabase.auth.getSession()
      const RazorpayCtor = getRazorpay()
      const rzp = new RazorpayCtor({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        name: 'AiLeadX',
        description: `CallerDesk Telephony — ${usersCount} users × 3 months`,
        prefill: {
          name: profile?.name ?? undefined,
          email: session?.user?.email ?? undefined,
        },
        handler: async () => {
          setPayStatus('verifying')
          await new Promise(r => setTimeout(r, 2500))
          await refetch()
          queryClient.invalidateQueries({ queryKey: ['wallet_transactions'] })
          setPayStatus('success')
          toast.success('Telephony subscription activated!')
        },
        modal: {
          ondismiss: () => setPayStatus('idle'),
          escape: true,
          backdropclose: true,
        },
        theme: { color: '#6366f1' },
      })

      rzp.on('payment.failed', (response) => {
        setErrorMsg(razorpayFailureMessage(response))
        setPayStatus('failed')
      })

      setPayStatus('open')
      rzp.open()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed. Please try again.')
      setPayStatus('failed')
    }
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Telephony Balance
        </CardTitle>
        <Badge
          variant="outline"
          className={
            isActive && !isExpiringSoon
              ? 'bg-green-50 text-green-700 border-green-200'
              : isExpiringSoon
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : isExpired
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }
        >
          {isActive && !isExpiringSoon
            ? 'Active'
            : isExpiringSoon
            ? 'Expiring Soon'
            : isExpired
            ? 'Expired'
            : 'Not Subscribed'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Balance display */}
        {(isActive || isExpired) && sub ? (
          <>
            <p className="text-2xl font-bold tracking-tight">
              Telephony Balance: {sub.users_count} User{sub.users_count > 1 ? 's' : ''} — Unlimited Calls
            </p>
            {validTill && (
              <p className={`text-sm ${
                isExpired
                  ? 'text-destructive font-medium'
                  : isExpiringSoon
                  ? 'text-orange-600 font-medium'
                  : 'text-muted-foreground'
              }`}>
                Valid Till: {format(validTill, 'dd/MM/yyyy')}
                {isExpiringSoon && !isExpired && daysRemaining !== null && (
                  <span className="ml-2">({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left)</span>
                )}
                {isExpired && <span className="ml-2">(Expired)</span>}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active telephony subscription. Subscribe to enable unlimited calls via CallerDesk.
          </p>
        )}

        {/* Pricing info — always visible */}
        <p className="text-xs text-muted-foreground">
          ₹1,000/user/month · billed quarterly · minimum 2 users
        </p>

        {/* Pay / Renew section */}
        {showPaySection && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Number of users</Label>
              <Input
                type="number"
                min={2}
                max={999}
                value={usersCount}
                onChange={(e) => setUsersCount(Math.max(2, parseInt(e.target.value) || 2))}
                disabled={payStatus !== 'idle'}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Minimum 2 users required</p>
            </div>

            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>{usersCount} user{usersCount > 1 ? 's' : ''} × ₹3,000/quarter</p>
              <p className="font-semibold">
                Total: ₹{quarterlyAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground">
                Valid for 3 months from payment date
              </p>
            </div>

            {payStatus === 'success' ? (
              <p className="text-green-600 text-sm font-medium">
                ✓ Telephony subscription activated!
              </p>
            ) : payStatus === 'failed' ? (
              <div className="space-y-2">
                <p className="text-destructive text-sm">✕ {errorMsg ?? 'Payment failed.'}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPayStatus('idle'); setErrorMsg(null) }}
                >
                  Try Again
                </Button>
              </div>
            ) : payStatus === 'open' || payStatus === 'verifying' ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {payStatus === 'verifying'
                  ? 'Activating subscription...'
                  : 'Complete payment in Razorpay window...'}
              </p>
            ) : (
              <Button
                onClick={handlePay}
                disabled={payStatus !== 'idle' || usersCount < 2}
                className="w-full"
              >
                {payStatus === 'creating' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {payStatus === 'creating'
                  ? 'Creating order...'
                  : isExpired || hasNeverSubscribed
                  ? `Subscribe — ₹${quarterlyAmount.toLocaleString('en-IN')}`
                  : `Renew — ₹${quarterlyAmount.toLocaleString('en-IN')}`
                }
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
