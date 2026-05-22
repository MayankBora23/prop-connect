import { format } from 'date-fns';
import { Search, Sun, Moon } from 'lucide-react';
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
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AutomobileDashboardHeaderProps {
  companyName?: string;
  userName?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function AutomobileDashboardHeader({
  companyName,
  userName,
  searchQuery,
  onSearchChange,
}: AutomobileDashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useCurrentProfile();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-40" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-300">
            Welcome back, {userName ?? profile?.name ?? 'there'} 👋
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {companyName ?? 'Automobile CRM'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search leads, vehicles, deals..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-slate-600/50 bg-slate-800/80 pl-9 text-white placeholder:text-slate-500 focus-visible:ring-slate-500"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <div className="[&_button]:text-slate-300 [&_button]:hover:bg-slate-700 [&_button]:hover:text-white">
            <NotificationCenter />
          </div>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg ring-2 ring-white/20 transition hover:scale-105">
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
