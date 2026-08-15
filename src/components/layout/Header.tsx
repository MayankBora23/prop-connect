import { useState } from 'react';
import { Bell, Search, Plus, LogOut, Crown, Clock, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/workspace/NotificationCenter';
import { useCompanySubscription } from '@/hooks/useSubscription';
import { useCurrentCompany } from '@/hooks/useCompany';
import { UpgradeDialog } from '@/components/subscription/UpgradeDialog';
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
  showSearch?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function Header({
  title,
  subtitle,
  onAddNew,
  addNewLabel = 'Add New',
  showSearch = false,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useCurrentProfile();
  const { data: company } = useCurrentCompany();
  const { data: subscriptionData } = useCompanySubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isInternalCRM = company?.industry === 'internal_crm';
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-3 md:px-6">
        <button
          className="md:hidden p-2 -ml-2 rounded-md hover:bg-accent text-foreground mr-1 shrink-0"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-xl font-semibold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {showSearch && onSearchChange && (
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 pl-9 bg-secondary border-0"
              />
            </div>
          )}

          <NotificationCenter />

          {!isInternalCRM && subscriptionData && (() => {
            const planSlug = (subscriptionData as any).plan_slug ?? 'trial';
            const planColors: Record<string, string> = {
              trial:      'bg-blue-50 border-blue-200 text-blue-700',
              starter:    'bg-green-50 border-green-200 text-green-700',
              growth:     'bg-blue-50 border-blue-200 text-blue-700',
              pro:        'bg-purple-50 border-purple-200 text-purple-700',
              enterprise: 'bg-red-50 border-red-200 text-red-700',
            };
            const planColor = planColors[planSlug] ?? planColors.starter;
            const badgeColor =
              subscriptionData.isTrialActive && subscriptionData.daysLeftInTrial <= 3
                ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                : subscriptionData.isTrialActive
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : subscriptionData.isActive
                    ? planColor
                    : 'bg-red-50 border-red-200 text-red-700';
            return (
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${badgeColor}`}
              >
                {subscriptionData.isTrialActive && <Clock className="w-3 h-3 shrink-0" />}
                {subscriptionData.isActive && <Crown className="w-3 h-3 shrink-0" />}
                <span className="hidden sm:inline">
                  {subscriptionData.isTrialActive
                    ? `Trial: ${subscriptionData.daysLeftInTrial}d left`
                    : subscriptionData.isActive
                      ? `${subscriptionData.plan_name || 'Active'} ✓`
                      : 'Trial Expired'}
                </span>
                <span className="sm:hidden">
                  {subscriptionData.isTrialActive
                    ? `${subscriptionData.daysLeftInTrial}d`
                    : subscriptionData.isActive
                      ? '✓'
                      : '!'}
                </span>
              </button>
            );
          })()}
          {!isInternalCRM && (
            <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
          )}

          {onAddNew && (
            <Button onClick={onAddNew} size="sm" className="gradient-primary border-0 shrink-0">
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{addNewLabel}</span>
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
    </header>
  );
}
