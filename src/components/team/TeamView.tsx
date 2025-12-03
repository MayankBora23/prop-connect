import { mockUsers, User } from '@/data/mockData';
import { Mail, Phone, Shield, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TeamView() {
  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', class: 'bg-destructive/10 text-destructive' };
      case 'manager':
        return { label: 'Manager', class: 'bg-primary/10 text-primary' };
      case 'agent':
        return { label: 'Agent', class: 'bg-success/10 text-success' };
      case 'telecaller':
        return { label: 'Telecaller', class: 'bg-warning/10 text-warning' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{mockUsers.length}</p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-success-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {mockUsers.reduce((sum, u) => sum + u.dealsClosed, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Deals</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
            <Users className="w-6 h-6 text-info-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {mockUsers.reduce((sum, u) => sum + u.leadsAssigned, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Leads</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-warning flex items-center justify-center">
            <Shield className="w-6 h-6 text-warning-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {mockUsers.filter(u => u.role === 'admin' || u.role === 'manager').length}
            </p>
            <p className="text-sm text-muted-foreground">Admins/Managers</p>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockUsers.map((user) => {
          const roleBadge = getRoleBadge(user.role);
          return (
            <div key={user.id} className="card-elevated p-6 animate-scale-in">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{user.name}</h3>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleBadge.class)}>
                      {roleBadge.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{user.leadsAssigned}</p>
                  <p className="text-xs text-muted-foreground">Leads</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-success">{user.dealsClosed}</p>
                  <p className="text-xs text-muted-foreground">Deals</p>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4">
                View Profile
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
