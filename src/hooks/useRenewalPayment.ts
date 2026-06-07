import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useSubscription } from '@/hooks/useSubscription';

type RazorpayPaymentFailed = {
  error?: { description?: string; reason?: string };
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

async function loadRazorpayScript(): Promise<void> {
  if ((window as unknown as { Razorpay?: RazorpayCheckout }).Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.head.appendChild(script);
  });
}

async function readEdgeFunctionError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  const ctx = error.context;
  if (!(ctx instanceof Response)) return null;
  try {
    const text = (await ctx.text()).trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      return parsed.error ?? text;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

type RenewalOrderResponse = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
};

export function useRenewalPayment() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const { refetch } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const payRenewal = async (): Promise<boolean> => {
    if (!company?.id) {
      toast.error('Company not found.');
      return false;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-renewal-order', {
        body: { company_id: company.id },
      });

      if (error) {
        const msg = await readEdgeFunctionError(error);
        throw new Error(msg ?? error.message);
      }

      const raw = (typeof data === 'string' ? JSON.parse(data) : data) as RenewalOrderResponse;
      const order_id = String(raw?.order_id ?? '');
      const key_id = String(raw?.key_id ?? '');
      const amount = Number(raw?.amount);
      const currency = String(raw?.currency ?? 'INR');

      if (!order_id || !key_id || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid response from payment server');
      }

      await loadRazorpayScript();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const RazorpayCtor = getRazorpay();

      return await new Promise<boolean>((resolve) => {
        const rzp = new RazorpayCtor({
          key: key_id,
          order_id,
          amount,
          currency,
          name: 'AiLeadX',
          description: 'Subscription Renewal',
          prefill: {
            email: user?.email ?? undefined,
          },
          handler: async () => {
            await new Promise((r) => setTimeout(r, 2000));
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['company-subscription'] }),
              queryClient.invalidateQueries({ queryKey: ['subscription-billing'] }),
              queryClient.invalidateQueries({ queryKey: ['currentCompany'] }),
              refetch()
            ]);
            toast.success('Renewal payment successful. Your subscription has been extended.');
            resolve(true);
          },
          modal: {
            ondismiss: () => resolve(false),
            escape: true,
            backdropclose: true,
          },
          theme: { color: '#6366f1' },
        });

        rzp.on('payment.failed', (response) => {
          const desc =
            response.error?.description?.trim() ||
            response.error?.reason?.trim() ||
            'Payment failed. Please try again.';
          toast.error(desc);
          resolve(false);
        });

        rzp.open();
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to initiate renewal payment. Please try again.'
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { payRenewal, isLoading };
}
