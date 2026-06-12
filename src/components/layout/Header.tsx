import { Bell, Search, Plus, LogOut, Sparkles, Calendar, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/workspace/NotificationCenter';
import { useState } from 'react';
import { useCurrentCompany } from '@/hooks/useCompany';
import { UpgradePlanDialog } from '@/components/settings/UpgradePlanDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
}

export function Header({ title, subtitle, onAddNew, addNewLabel = 'Add New' }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useCurrentProfile();
  const navigate = useNavigate();

  const { data: company } = useCurrentCompany();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Trial Period Calculations
  const createdAt = company?.created_at ? new Date(company.created_at) : new Date();
  const trialDurationDays = 14;
  const trialEndsAt = company?.trial_ends_at 
    ? new Date(company.trial_ends_at) 
    : new Date(createdAt.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const isPremium = company?.plan_type === 'premium' || company?.status_notes === 'premium' || company?.plan_type === 'bypass' || company?.status_notes === 'bypass';
  const isBypass = company?.plan_type === 'bypass' || company?.status_notes === 'bypass';
  
  const timeDiff = trialEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  const isInternalCRM = company?.industry === 'internal_crm';
  const isTrialActive = !isInternalCRM && !isPremium && daysRemaining > 0;
  const showPremiumBadge = isPremium && !isBypass && !isInternalCRM;
  const showBypassBadge = isBypass && !isInternalCRM;

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          {/* Trial / Premium Status Badge */}
          {isTrialActive && (
            <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-pink-500/10 dark:from-orange-500/20 dark:to-pink-500/20 border border-orange-500/20 dark:border-orange-500/30 px-3 py-1 rounded-full text-xs font-semibold text-orange-600 dark:text-orange-400 shadow-sm">
              <Calendar className="w-3.5 h-3.5 animate-pulse text-orange-500" />
              <span>Trial: {daysRemaining} days left</span>
              <button 
                onClick={() => setUpgradeOpen(true)}
                className="ml-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide transition-all shadow-sm hover:shadow"
              >
                Upgrade
              </button>
            </div>
          )}

          {showPremiumBadge && (
            <div className="hidden sm:flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5 fill-current text-primary animate-pulse" />
              <span>Premium Enterprise</span>
            </div>
          )}

          {showBypassBadge && (
            <div className="hidden sm:flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-semibold text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
              <span>Bypass Plan (Unlocked)</span>
            </div>
          )}

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads, properties..."
              className="w-64 pl-9 bg-secondary border-0"
            />
          </div>

          <NotificationCenter />

          {onAddNew && (
            <Button onClick={onAddNew} className="gradient-primary border-0">
              <Plus className="w-4 h-4 mr-2" />
              {addNewLabel}
            </Button>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                  {profile?.name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </header>
  );
}
