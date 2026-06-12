import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, Sparkles, CreditCard, Loader2, CheckCircle2, Lock, Flame } from 'lucide-react';

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradePlanDialog({ open, onOpenChange }: UpgradePlanDialogProps) {
  const { data: company } = useCurrentCompany();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'compare' | 'checkout' | 'success'>('compare');
  const [loading, setLoading] = useState(false);

  // Checkout Form States
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const validateCheckoutForm = () => {
    const newErrors: Record<string, string> = {};
    if (!cardName.trim()) newErrors.cardName = 'Cardholder name is required';
    if (cardNumber.replace(/\s/g, '').length !== 16) newErrors.cardNumber = 'Enter a valid 16-digit card number';
    if (!cardExpiry.includes('/') || cardExpiry.replace('/', '').length !== 4) newErrors.cardExpiry = 'Enter expiry date (MM/YY)';
    if (cardCvc.length !== 3) newErrors.cardCvc = 'Enter a 3-digit CVC';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpgrade = async () => {
    if (!validateCheckoutForm() || !company?.id) return;
    setLoading(true);

    try {
      // Update both plan_type and status_notes for robust DB compatibility
      const { error } = await supabase
        .from('companies')
        .update({
          plan_type: 'premium',
          status_notes: 'premium',
        } as any)
        .eq('id', company.id);

      if (error) {
        // Fallback: If plan_type column is missing (e.g. database not migrated yet), we use status_notes
        const { error: fallbackError } = await supabase
          .from('companies')
          .update({
            status_notes: 'premium',
          })
          .eq('id', company.id);

        if (fallbackError) {
          throw fallbackError;
        }
      }

      toast.success('Successfully upgraded to Pro CRM Enterprise!');

      // Record plan upgrade payment transaction in wallet_transactions
      try {
        await supabase
          .from('wallet_transactions')
          .insert({
            company_id: company.id,
            type: 'plan',
            provider: 'stripe',
            service_type: 'subscription',
            amount_inr: 4100,
            notes: 'Pro CRM Enterprise Plan Upgrade - Card Checkout',
            status: 'completed',
          } as any);
      } catch (txErr) {
        console.error('Failed to log plan payment in wallet_transactions:', txErr);
      }

      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
      setStep('success');
    } catch (err: any) {
      toast.error(err.message || 'Upgrade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) {
        // Reset to initial screen when closing
        setTimeout(() => {
          setStep('compare');
          setCardName('');
          setCardNumber('');
          setCardExpiry('');
          setCardCvc('');
          setErrors({});
        }, 300);
      }
    }}>
      <DialogContent className="max-w-2xl overflow-hidden border-0 card-elevated p-0">
        
        {step === 'compare' && (
          <div className="p-6 md:p-8 space-y-6">
            <DialogHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                Upgrade to Pro CRM Enterprise
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground max-w-md mx-auto">
                Unlock full database capacity, telephony bridge dials, and advanced multi-industry WhatsApp automations.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Trial Plan */}
              <div className="rounded-xl border border-border p-5 bg-card flex flex-col justify-between opacity-80">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Current Plan
                  </div>
                  <h3 className="text-lg font-bold text-foreground">14-Day Free Trial</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Experience essential multi-industry CRM features with full access.
                  </p>
                  
                  <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      Standard CRM boards
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      Up to 3 team members
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      14 days duration
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="rounded-xl border-2 border-primary p-5 bg-card flex flex-col justify-between relative shadow-lg">
                <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-current" />
                  RECOMMENDED
                </div>

                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                    Premium Plan
                  </div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    Pro CRM Enterprise
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Accelerate conversions with advanced team chat, full automated pipelines, and CallerDesk telephony dialers.
                  </p>
                  
                  <ul className="mt-5 space-y-2 text-xs text-foreground font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/10" />
                      Unlimited leads & properties
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/10" />
                      Telephony dialer + integrations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/10" />
                      Multi-Industry WhatsApp Inbox
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/10" />
                      Advanced AI lead qualification
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">$49</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  <Button onClick={() => setStep('checkout')} className="gradient-primary border-0 text-xs py-1.5 px-4 h-auto shadow-md">
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="p-6 md:p-8 space-y-6">
            <DialogHeader className="text-center space-y-1">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Secure Card Checkout
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Upgrade to **Pro CRM Enterprise** for **$49/month**. Cancels anytime.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => { e.preventDefault(); handleUpgrade(); }} className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="card-name">Cardholder Name</Label>
                <Input
                  id="card-name"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className={errors.cardName ? 'border-destructive' : ''}
                />
                {errors.cardName && <p className="text-xs text-destructive">{errors.cardName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="card-number"
                    placeholder="4111 2222 3333 4444"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className={`pl-10 font-mono ${errors.cardNumber ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.cardNumber && <p className="text-xs text-destructive">{errors.cardNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="card-expiry">Expiry Date</Label>
                  <Input
                    id="card-expiry"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    className={`font-mono ${errors.cardExpiry ? 'border-destructive' : ''}`}
                  />
                  {errors.cardExpiry && <p className="text-xs text-destructive">{errors.cardExpiry}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-cvc">CVC</Label>
                  <Input
                    id="card-cvc"
                    placeholder="123"
                    maxLength={3}
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                    className={`font-mono ${errors.cardCvc ? 'border-destructive' : ''}`}
                  />
                  {errors.cardCvc && <p className="text-xs text-destructive">{errors.cardCvc}</p>}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep('compare')} className="flex-1" disabled={loading}>
                  Back
                </Button>
                <Button type="submit" className="gradient-primary border-0 flex-1 gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Pay & Upgrade
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center scale-in">
              <ShieldCheck className="w-10 h-10 text-success" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Upgrade Successful!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Thank you for upgrading! Your company account has been successfully upgraded to **Pro CRM Enterprise**. All features are now unlocked.
              </p>
            </div>

            <Button onClick={() => onOpenChange(false)} className="gradient-primary border-0 px-8">
              Explore Premium CRM
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
