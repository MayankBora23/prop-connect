import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquare,
  Calendar,
  Clock,
  UserCog,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Briefcase,
  Wallet,
  LifeBuoy,
} from 'lucide-react';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useIndustry } from '@/hooks/useIndustry';
import { useTicketStats } from '@/hooks/useSupport';
import { GraduationCap, BookOpen, Users2, CalendarCheck, FileText, DollarSign, Stethoscope, User, File, Pill, CreditCard, Car, FileCheck, ShoppingBag, Package, Archive, ClipboardList, Receipt, RotateCcw, Tag, Truck, QrCode, CheckCircle, UserCheck, Phone, Video, LayoutTemplate } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { useCurrentCompany } from '@/hooks/useCompany';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const realEstateMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: undefined },
  { id: 'leads', label: 'Leads', icon: Users, badge: undefined },
  { id: 'properties', label: 'Properties', icon: Building2, badge: undefined },
  { id: 'employees', label: 'Employees', icon: UserCheck, badge: undefined },
  { id: 'employee-attendance', label: 'Employee Attendance', icon: Calendar, badge: undefined },
  { id: 'purchased', label: 'Purchased', icon: CheckCircle, badge: undefined },
  { id: 'inbox', label: 'WhatsApp Inbox', icon: MessageSquare, badge: 3 },
  { id: 'telephony', label: 'Telephony', icon: Phone, badge: undefined },
  { id: 'visits', label: 'Site Visits', icon: Calendar, badge: undefined },
  { id: 'followups', label: 'Follow-ups', icon: Clock, badge: 5 },
  { id: 'workspace', label: 'Workspace', icon: Briefcase, badge: undefined },
  { id: 'team', label: 'Team', icon: UserCog, badge: undefined },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: undefined },
  { id: 'credits', label: 'Credits', icon: Wallet, badge: undefined },
  { id: 'billing', label: 'Billing', icon: CreditCard, badge: undefined },
  { id: 'templates', label: 'WA Templates', icon: LayoutTemplate, badge: undefined, metaOnly: true },
  { id: 'support', label: 'Support', icon: LifeBuoy, badge: undefined },
  { id: 'profile-settings', label: 'Profile Settings', icon: User, badge: undefined },
  { id: 'company-settings', label: 'Company Settings', icon: Settings, superAdminOnly: true, badge: undefined },
];

const educationMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: undefined },
  { id: 'students', label: 'Students', icon: Users2, badge: undefined },
  { id: 'courses', label: 'Courses', icon: BookOpen, badge: undefined },
  { id: 'batches', label: 'Batches', icon: CalendarCheck, badge: undefined },
  { id: 'teachers', label: 'Teachers', icon: GraduationCap, badge: undefined },
  { id: 'enrollments', label: 'Enrollments', icon: Users, badge: undefined },
  { id: 'attendance', label: 'Attendance', icon: Calendar, badge: undefined },
  { id: 'employees', label: 'Employees', icon: UserCheck, badge: undefined },
  { id: 'employee-attendance', label: 'Employee Attendance', icon: Calendar, badge: undefined },
  { id: 'fees', label: 'Fees', icon: DollarSign, badge: undefined },
  { id: 'telephony', label: 'Telephony', icon: Phone, badge: undefined },
  { id: 'whatsapp-inbox', label: 'WhatsApp Inbox', icon: MessageSquare, badge: undefined },
  { id: 'workspace', label: 'Workspace', icon: Briefcase, badge: undefined },
  { id: 'team', label: 'Team', icon: UserCog, badge: undefined },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: undefined },
  { id: 'credits', label: 'Credits', icon: Wallet, badge: undefined },
  { id: 'billing', label: 'Billing', icon: CreditCard, badge: undefined },
  { id: 'templates', label: 'WA Templates', icon: LayoutTemplate, badge: undefined, metaOnly: true },
  { id: 'support', label: 'Support', icon: LifeBuoy, badge: undefined },
  { id: 'profile-settings', label: 'Profile Settings', icon: User, badge: undefined },
  { id: 'company-settings', label: 'Company Settings', icon: Settings, superAdminOnly: true, badge: undefined },
];

/* healthcare removed */

const automobileMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: undefined },
  { id: 'vehicles', label: 'Vehicles', icon: Car, badge: undefined },
  { id: 'leads', label: 'Leads', icon: Users, badge: undefined },
  { id: 'test-drives', label: 'Test Drives', icon: Calendar, badge: undefined },
  { id: 'bookings', label: 'Bookings', icon: FileCheck, badge: undefined },
  { id: 'deals', label: 'Deals', icon: Briefcase, badge: undefined },
  { id: 'employees', label: 'Employees', icon: UserCheck, badge: undefined },
  { id: 'employee-attendance', label: 'Employee Attendance', icon: Calendar, badge: undefined },
  { id: 'telephony', label: 'Telephony', icon: Phone, badge: undefined },
  { id: 'whatsapp-inbox', label: 'WhatsApp Inbox', icon: MessageSquare, badge: undefined },
  { id: 'workspace', label: 'Workspace', icon: Home, badge: undefined },
  { id: 'team', label: 'Team', icon: UserCog, badge: undefined },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: undefined },
  { id: 'credits', label: 'Credits', icon: Wallet, badge: undefined },
  { id: 'billing', label: 'Billing', icon: CreditCard, badge: undefined },
  { id: 'templates', label: 'WA Templates', icon: LayoutTemplate, badge: undefined, metaOnly: true },
  { id: 'support', label: 'Support', icon: LifeBuoy, badge: undefined },
  { id: 'profile-settings', label: 'Profile Settings', icon: User, badge: undefined },
  { id: 'company-settings', label: 'Company Settings', icon: Settings, superAdminOnly: true, badge: undefined },
];

/* online business removed */

const internalCRMMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: undefined },
  { id: 'leads', label: 'Leads', icon: Users, badge: undefined },
  { id: 'demos', label: 'Demo Scheduled', icon: Video, badge: undefined },
  { id: 'companies', label: 'Companies', icon: Building2, badge: undefined },
  { id: 'employees', label: 'Employees', icon: UserCheck, badge: undefined },
  { id: 'employee-attendance', label: 'Employee Attendance', icon: Calendar, badge: undefined },
  { id: 'whatsapp-inbox', label: 'WhatsApp Inbox', icon: MessageSquare, badge: undefined },
  { id: 'telephony', label: 'Telephony', icon: Phone, badge: undefined },
  { id: 'workspace', label: 'Workspace', icon: Briefcase, badge: undefined },
  { id: 'team', label: 'Team', icon: UserCog, badge: undefined },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: undefined },
  { id: 'credits', label: 'Credits', icon: Wallet, badge: undefined },
  { id: 'templates', label: 'WA Templates', icon: LayoutTemplate, badge: undefined, metaOnly: true },
  { id: 'support', label: 'Client Support', icon: LifeBuoy, badge: undefined },
  { id: 'profile-settings', label: 'Profile Settings', icon: User, badge: undefined },
  { id: 'company-settings', label: 'Platform Settings', icon: Settings, superAdminOnly: true, badge: undefined },
];

const REPORTS_MENU_ITEM = {
  id: 'reports',
  label: 'Reports',
  icon: BarChart3,
  badge: undefined as number | undefined,
};

export function Sidebar({ activeTab, onTabChange, onCollapsedChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: profile } = useCurrentProfile();
  const { data: ticketStats } = useTicketStats();
  const { data: industry, isLoading: industryLoading, isLoaded } = useIndustry();
  const { data: company } = useCurrentCompany();
  const isMetaProvider = company?.whatsapp_provider === 'meta';
  if (industryLoading || !isLoaded) {
    return (
      <aside className="w-64 h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-muted w-10 h-10 border-t-primary" />
      </aside>
    );
  }
  const isSuperAdmin = profile?.role === 'super_admin';

  const canSeeTeamReports =
    profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'manager';

  const baseMenuItems = useMemo(() => {
    if (industry === 'education') return educationMenuItems;
    if (industry === 'automobile_dealers') return automobileMenuItems;
    if (industry === 'internal_crm') return internalCRMMenuItems;
    return realEstateMenuItems;
  }, [industry]);

  const menuItems = useMemo(() => {
    const items = [...baseMenuItems];
    if (canSeeTeamReports) {
      const supportIdx = items.findIndex((i) => i.id === 'support');
      if (supportIdx >= 0) {
        items.splice(supportIdx, 0, REPORTS_MENU_ITEM);
      } else {
        items.push(REPORTS_MENU_ITEM);
      }
    }
    return items;
  }, [baseMenuItems, canSeeTeamReports]);

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if ((item as any).metaOnly && !isMetaProvider) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64',
        activeTab === 'reports' && 'print:hidden'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Home className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">RealCRM</span>
          </div>
        )}
        <button
          onClick={() => {
            const newCollapsed = !collapsed;
            setCollapsed(newCollapsed);
            onCollapsedChange?.(newCollapsed);
          }}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isAdminRole = profile?.role === 'super_admin' || profile?.role === 'admin';
          const supportUnread =
            item.id === 'support' &&
              isAdminRole &&
              ticketStats?.unread_by_admin &&
              ticketStats.unread_by_admin > 0
              ? ticketStats.unread_by_admin
              : undefined;
          const badge = supportUnread ?? item.badge;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-sidebar-primary-foreground')} />
              {!collapsed && (
                <>
                  <span className="font-medium text-sm">{item.label}</span>
                  {badge != null && badge !== undefined && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge != null && badge !== undefined && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm">
            PS
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Priya Sharma</p>
              <p className="text-xs text-muted-foreground truncate">Manager</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
