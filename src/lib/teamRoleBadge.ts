import type { AppRole } from '@/hooks/useCompany';

export function getTeamRoleBadge(role: AppRole | null | undefined) {
  switch (role) {
    case 'super_admin':
      return { label: 'Super Admin', className: 'bg-destructive/10 text-destructive' };
    case 'admin':
      return { label: 'Admin', className: 'bg-primary/10 text-primary' };
    case 'manager':
      return { label: 'Manager', className: 'bg-success/10 text-success' };
    case 'sales':
      return { label: 'Sales', className: 'bg-warning/10 text-warning' };
    default:
      return { label: 'User', className: 'bg-muted text-muted-foreground' };
  }
}
