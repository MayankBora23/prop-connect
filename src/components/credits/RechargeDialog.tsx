import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useCreateRazorpayOrder, useConfirmRazorpayPayment } from '@/hooks/useWallet';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RechargeStatus = 'idle' | 'creating' | 'open' | 'verifying' | 'success' | 'failed';

type RazorpayPaymentFailed = {
  error?: {
    description?: string;
    reason?: string;
    code?: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayPaymentFailed) => void) => void;
};

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

export function RechargeDialog({ open, onOpenChange }: RechargeDialogProps) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<RechargeStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createOrderMutation = useCreateRazorpayOrder();
  const confirmMutation = useConfirmRazorpayPayment();
  const { data: profile } = useCurrentProfile();

  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const dialogModal = status === 'idle' || status === 'creating' || status === 'failed' || status === 'success';

  const handleOpenChange = (next: boolean) => {
    if (status === 'open' || status === 'verifying') return;
    if (!next) {
      setAmount('');
      setStatus('idle');
      setErrorMessage(null);
    }
    onOpenChange(next);
  };

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setStatus('creating');
    setErrorMessage(null);

    try {
      const order = await createOrderMutation.mutateAsync(amt);

      if (!(window as unknown as { Razorpay?: RazorpayCheckout }).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.head.appendChild(script);
        });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const RazorpayCtor = getRazorpay();
      const rzp = new RazorpayCtor({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'AiLeadX',
        description: 'Wallet Recharge',
        prefill: {
          name: profile?.name ?? undefined,
          email: user?.email ?? undefined,
        },
        handler: async () => {
          setStatus('verifying');
          try {
            await confirmMutation.mutateAsync();
            setStatus('success');
          } catch {
            setErrorMessage('Payment received — balance may take a moment to update. Refresh if needed.');
            setStatus('failed');
          }
        },
        modal: {
          ondismiss: () => {
            setStatus('idle');
          },
          escape: true,
          backdropclose: true,
        },
        theme: { color: '#6366f1' },
      });

      rzp.on('payment.failed', (response) => {
        setErrorMessage(razorpayFailureMessage(response));
        setStatus('failed');
      });

      setStatus('open');
      rzp.open();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setStatus('failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={dialogModal}>
      <DialogContent className={status === 'open' || status === 'verifying' ? 'pointer-events-none' : undefined}>
        <DialogHeader>
          <DialogTitle>Add Balance</DialogTitle>
          <DialogDescription>
            Amount paid in ₹ will be added directly to your wallet balance. In test mode use card{' '}
            <span className="font-mono text-xs">4111 1111 1111 1111</span> or UPI{' '}
            <span className="font-mono text-xs">success@razorpay</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              min={1}
              max={500000}
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={status !== 'idle'}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[100, 500, 1000, 5000].map((val) => (
              <Button
                key={val}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(String(val))}
                disabled={status !== 'idle'}
              >
                ₹{val}
              </Button>
            ))}
          </div>

          {validAmount && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>You will be charged: ₹{amount}</p>
              <p className="text-muted-foreground">
                This amount will be added to your wallet balance.
              </p>
            </div>
          )}

          {status === 'success' ? (
            <div className="space-y-3 text-center">
              <p className="text-green-600 dark:text-green-400">
                ✓ ₹{amount} added to your balance!
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </div>
          ) : status === 'failed' ? (
            <div className="space-y-3 text-center">
              <p className="text-destructive">
                ✕ {errorMessage ?? 'Payment failed. Please try again.'}
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setStatus('idle');
                  setErrorMessage(null);
                }}
              >
                Try Again
              </Button>
            </div>
          ) : status === 'open' || status === 'verifying' ? (
            <p className="text-center text-sm text-muted-foreground">
              Complete payment in the Razorpay window…
            </p>
          ) : (
            <Button
              type="button"
              className="w-full"
              disabled={!validAmount || status !== 'idle'}
              onClick={handlePay}
            >
              {status === 'creating' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === 'creating' ? 'Creating order...' : `Pay ₹${amount || '0'} via Razorpay`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
