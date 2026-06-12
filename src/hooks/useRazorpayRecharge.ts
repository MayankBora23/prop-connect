import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color: string };
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.Razorpay));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(!!window.Razorpay);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpayRecharge() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const recharge = useCallback(
    async (amountInr: number) => {
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) {
        toast.error('Razorpay is not configured. Add VITE_RAZORPAY_KEY_ID to your environment.');
        return false;
      }

      setLoading(true);
      try {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          toast.error('Failed to load payment gateway');
          return false;
        }

        const { data: orderData, error: orderError } = await supabase.functions.invoke(
          'create-razorpay-order',
          { body: { amount_inr: amountInr } }
        );

        if (orderError || !orderData?.order_id) {
          const msg =
            (orderData as { error?: string })?.error ??
            orderError?.message ??
            'Could not create payment order';
          toast.error(msg);
          return false;
        }

        const order = orderData as {
          order_id: string;
          amount: number;
          key_id: string;
          prefill?: { name?: string; email?: string };
        };

        return await new Promise<boolean>((resolve) => {
          const rzp = new window.Razorpay!({
            key: order.key_id || keyId,
            amount: order.amount,
            currency: 'INR',
            name: 'Aileadx CRM',
            description: `Wallet recharge ₹${amountInr}`,
            order_id: order.order_id,
            prefill: order.prefill,
            theme: { color: '#4F46E5' },
            handler: async (response: RazorpayCheckoutResponse) => {
              try {
                const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
                  'verify-razorpay-payment',
                  { body: response }
                );

                if (verifyError || !(verifyData as { success?: boolean })?.success) {
                  const msg =
                    (verifyData as { error?: string })?.error ??
                    verifyError?.message ??
                    'Payment verification failed';
                  toast.error(msg);
                  resolve(false);
                  return;
                }

                const balance = (verifyData as { balance?: number }).balance;
                toast.success(
                  balance != null
                    ? `₹${amountInr} added. New balance: ₹${Number(balance).toFixed(2)}`
                    : `₹${amountInr} added to your wallet`
                );
                queryClient.invalidateQueries({ queryKey: ['wallet'] });
                queryClient.invalidateQueries({ queryKey: ['wallet_transactions'] });
                resolve(true);
              } catch {
                toast.error('Payment verification failed');
                resolve(false);
              }
            },
            modal: {
              ondismiss: () => resolve(false),
            },
          });
          rzp.open();
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Payment failed');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [queryClient]
  );

  return { recharge, loading, quickAmounts: QUICK_AMOUNTS };
}
