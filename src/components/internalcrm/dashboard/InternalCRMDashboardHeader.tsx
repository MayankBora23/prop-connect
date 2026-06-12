import { format } from 'date-fns';
import { Search, Sun, Moon, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/workspace/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface InternalCRMDashboardHeaderProps {
  companyName?: string;
  userName?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function InternalCRMDashboardHeader({
  companyName,
  userName,
  searchQuery,
  onSearchChange,
}: InternalCRMDashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useCurrentProfile();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-indigo-950 via-violet-900 to-slate-900 p-6 text-white shadow-xl">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-40" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-violet-200">
            Welcome back, {userName ?? profile?.name ?? 'there'}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {companyName ?? 'Aileadx Platform'}
          </h1>
          <p className="mt-1 text-sm text-violet-300/80">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Internal CRM Command Center
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70" />
            <Input
              placeholder="Search leads, companies..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-violet-500/30 bg-violet-950/50 pl-9 text-white placeholder:text-violet-400/60 focus-visible:ring-violet-400"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-violet-200 hover:bg-violet-800/50 hover:text-white"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <div className="[&_button]:text-violet-200 [&_button]:hover:bg-violet-800/50 [&_button]:hover:text-white">
            <NotificationCenter />
          </div>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-lg ring-2 ring-white/20 transition hover:scale-105">
                  {profile?.name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
