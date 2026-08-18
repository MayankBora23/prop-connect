import { Bell, Search, Plus, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useNavigate } from 'react-router-dom';
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
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onAddNew, addNewLabel = 'Add New', onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useCurrentProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-xl border border-border/70 p-2 text-muted-foreground transition-colors hover:bg-secondary lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
            {subtitle && <p className="hidden truncate text-sm text-muted-foreground sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads, properties..."
              className="w-56 rounded-full border-border/70 bg-secondary/60 pl-9 xl:w-72"
            />
          </div>

          <button
            className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </button>

          {onAddNew && (
            <Button onClick={onAddNew} className="rounded-full border-0 gradient-primary btn-glow">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{addNewLabel}</span>
            </Button>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  {profile?.name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name || 'User'}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
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
    </header>
  );
}
