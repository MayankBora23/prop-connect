import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquare,
  Calendar,
  Clock,
  UserCog,
  Zap,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
} from 'lucide-react';
import { useCurrentProfile } from '@/hooks/useProfiles';
import brandIcon from '@/assets/aileadx-icon.png';


interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'inbox', label: 'WhatsApp Inbox', icon: MessageSquare, badge: 3 },
  { id: 'visits', label: 'Site Visits', icon: Calendar },
  { id: 'followups', label: 'Follow-ups', icon: Clock, badge: 5 },
  { id: 'team', label: 'Team', icon: UserCog },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'company-settings', label: 'Company Settings', icon: Settings, superAdminOnly: true },
];

export function Sidebar({ activeTab, onTabChange, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: profile } = useCurrentProfile();
  const isSuperAdmin = profile?.role === 'super_admin';

  const visibleMenuItems = menuItems.filter((item) => !item.superAdminOnly || isSuperAdmin);

  const initials =
    profile?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={onMobileClose}
        className={cn(
          'fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-[100dvh] flex-col bg-sidebar transition-all duration-300 lg:z-40',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
          'w-[17rem]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <img src={brandIcon} alt="AiLeadX logo" className="h-9 w-9 rounded-xl" />
              <div className="leading-none">
                <span className="font-display text-lg font-bold text-sidebar-accent-foreground">
                  AiLead<span className="text-primary-glow">X</span>
                </span>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
                  Smart CRM
                </p>
              </div>
            </div>
          ) : (
            <img src={brandIcon} alt="AiLeadX logo" className="h-9 w-9 rounded-xl" />
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent lg:block"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={onMobileClose}
            className="rounded-lg p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onMobileClose?.();
                }}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full gradient-primary" />
                )}
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-transform group-hover:scale-110',
                    isActive && 'text-primary-glow'
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-sidebar-border p-3">
          <div className={cn('flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-2.5', collapsed && 'justify-center bg-transparent p-0')}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full gradient-primary text-sm font-semibold text-sidebar-primary-foreground">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                  {profile?.name || 'Your account'}
                </p>
                <p className="truncate text-xs capitalize text-sidebar-foreground/70">
                  {profile?.role?.replace('_', ' ') || 'Member'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
