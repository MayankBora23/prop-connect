import { useState } from 'react';
import { Bell, Search, Plus, LogOut, Crown, Clock } from 'lucide-react';
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
}

export function Header({ title, subtitle, onAddNew, addNewLabel = 'Add New' }: HeaderProps) {
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
      <div className="flex items-center justify-between h-16 px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads, properties..."
              className="w-64 pl-9 bg-secondary border-0"
            />
          </div>

          <NotificationCenter />

          {!isInternalCRM && subscriptionData && (
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                subscriptionData.isTrialActive && subscriptionData.daysLeftInTrial <= 3
                  ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                  : subscriptionData.isTrialActive
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : subscriptionData.isActive &&
                        subscriptionData.daysUntilBilling !== null &&
                        subscriptionData.daysUntilBilling <= 5
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : subscriptionData.isActive
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {subscriptionData.isTrialActive && <Clock className="w-3 h-3" />}
              {subscriptionData.isActive && <Crown className="w-3 h-3" />}
              <span>
                {subscriptionData.isTrialActive
                  ? `Trial: ${subscriptionData.daysLeftInTrial}d left`
                  : subscriptionData.isActive
                    ? `${subscriptionData.plan_name || 'Active'} ✓`
                    : 'Trial Expired'}
              </span>
            </button>
          )}
          {!isInternalCRM && (
            <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
          )}

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
    </header>
  );
}
