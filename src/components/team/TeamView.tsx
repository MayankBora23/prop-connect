import { useState } from 'react';
import { useProfiles, ProfileWithRole, useCurrentProfile } from '@/hooks/useProfiles';
import { useCurrentCompany, useUpdateTeamMemberRole, useRemoveTeamMember, AppRole } from '@/hooks/useCompany';
import { InviteTeamMemberDialog } from './InviteTeamMemberDialog';
import { Mail, Phone, Shield, Users, TrendingUp, UserPlus, MoreVertical, Trash2, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export function TeamView() {
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: currentProfile, isLoading: currentProfileLoading } = useCurrentProfile();
  const { data: company, isLoading: companyLoading } = useCurrentCompany();
  const updateRole = useUpdateTeamMemberRole();
  const removeMember = useRemoveTeamMember();
  const { toast } = useToast();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProfileWithRole | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const isLoading = profilesLoading || currentProfileLoading || companyLoading;

  const getRoleBadge = (role: ProfileWithRole['role']) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', class: 'bg-destructive/10 text-destructive' };
      case 'admin':
        return { label: 'Admin', class: 'bg-primary/10 text-primary' };
      case 'manager':
        return { label: 'Manager', class: 'bg-success/10 text-success' };
      case 'sales':
        return { label: 'Sales', class: 'bg-warning/10 text-warning' };
      default:
        return { label: 'User', class: 'bg-muted text-muted-foreground' };
    }
  };

  const canManageRoles = currentProfile?.role === 'super_admin';
  const canInvite = currentProfile?.role === 'super_admin' || currentProfile?.role === 'admin';

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!company) return;
    
    try {
      await updateRole.mutateAsync({
        userId,
        companyId: company.id,
        role: newRole,
      });
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
      setEditingRole(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember || !company) return;
    
    try {
      await removeMember.mutateAsync({
        userId: selectedMember.user_id,
        companyId: company.id,
      });
      toast({
        title: 'Success',
        description: `${selectedMember.name} has been removed from the team`,
      });
      setRemoveDialogOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove team member',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const users = profiles || [];
  const adminsManagers = users.filter(u => 
    u.role === 'super_admin' || u.role === 'admin' || u.role === 'manager'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Invite Button */}
      {canInvite && company && (
        <div className="flex justify-end">
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Team Member
          </Button>
        </div>
      )}

      {/* Company Info */}
      {company && (
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{company.name}</h2>
            <p className="text-sm text-muted-foreground">{company.email}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-success-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-sm text-muted-foreground">Total Deals</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
            <Users className="w-6 h-6 text-info-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-sm text-muted-foreground">Total Leads</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-warning flex items-center justify-center">
            <Shield className="w-6 h-6 text-warning-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{adminsManagers.length}</p>
            <p className="text-sm text-muted-foreground">Admins/Managers</p>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      {users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => {
            const roleBadge = getRoleBadge(user.role);
            const isCurrentUser = user.user_id === currentProfile?.user_id;
            const isSuperAdmin = user.role === 'super_admin';
            
            return (
              <div key={user.id} className="card-elevated p-6 animate-scale-in">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {user.name}
                        {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                      </h3>
                      {editingRole === user.user_id && canManageRoles && !isSuperAdmin ? (
                        <Select
                          value={user.role || 'sales'}
                          onValueChange={(value) => handleRoleChange(user.user_id, value as AppRole)}
                        >
                          <SelectTrigger className="h-7 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleBadge.class)}>
                          {roleBadge.label}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {canManageRoles && !isCurrentUser && !isSuperAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingRole(user.user_id)}>
                          <UserCog className="w-4 h-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setSelectedMember(user);
                            setRemoveDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove from Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full mt-4">
                  View Profile
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No team members found. Invite your team to get started.
        </div>
      )}

      {/* Invite Dialog */}
      {company && (
        <InviteTeamMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          companyId={company.id}
          currentUserRole={currentProfile?.role || null}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.name} from the team? 
              They will lose access to all company data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
