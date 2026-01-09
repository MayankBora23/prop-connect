import React, { useState } from 'react';
import { useFollowUps, FollowUpWithLead, useUpdateFollowUp } from '@/hooks/useFollowUps';
import { useLeads } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { Phone, MessageSquare, Calendar, Mail, Clock, Check, AlertCircle, User, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AddFollowUpDialog } from './AddFollowUpDialog';
import { EditFollowUpDialog } from './EditFollowUpDialog';
import type { Enums } from '@/integrations/supabase/types';

type FollowUpType = Enums<'follow_up_type'>;

export function FollowUpsView() {
  const { data: followUps, isLoading } = useFollowUps();
  const { data: leads } = useLeads();
  const { data: profiles } = useProfiles();
  const updateFollowUp = useUpdateFollowUp();
  const { toast } = useToast();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedLeadForScheduling, setSelectedLeadForScheduling] = useState<any>(null);
  const [editFollowUpDialogOpen, setEditFollowUpDialogOpen] = useState(false);
  const [selectedFollowUpForEditing, setSelectedFollowUpForEditing] = useState<FollowUpWithLead | null>(null);

  const pendingFollowUps = (followUps || []).filter(f => f.status === 'pending');
  const missedFollowUps = (followUps || []).filter(f => f.status === 'missed');
  const completedFollowUps = (followUps || []).filter(f => f.status === 'completed');

  // Get leads in follow-up stage that don't have pending follow-ups
  const followUpStageLeads = (leads || []).filter(lead => {
    const isInFollowUpStage = lead.stage === 'follow-up';
    const hasPendingFollowUp = pendingFollowUps.some(fu => fu.lead_id === lead.id);
    return isInFollowUpStage && !hasPendingFollowUp;
  });

  const getTypeIcon = (type: FollowUpType) => {
    switch (type) {
      case 'call': return Phone;
      case 'whatsapp': return MessageSquare;
      case 'meeting': return Calendar;
      case 'email': return Mail;
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await updateFollowUp.mutateAsync({ id, status: 'completed' });
      toast({
        title: 'Follow-up Completed',
        description: 'Follow-up marked as completed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update follow-up',
        variant: 'destructive',
      });
    }
  };

  const handleMarkMissed = async (id: string) => {
    try {
      await updateFollowUp.mutateAsync({ id, status: 'missed' });
      toast({
        title: 'Follow-up Marked as Missed',
        description: 'Follow-up moved to missed section',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update follow-up',
        variant: 'destructive',
      });
    }
  };

  const getAssignedProfileName = (assignedTo: string | null) => {
    if (!assignedTo || !profiles) return null;
    const profile = profiles.find(p => p.user_id === assignedTo);
    return profile?.name || null;
  };

  const handleEditFollowUp = (followUp: FollowUpWithLead) => {
    setSelectedFollowUpForEditing(followUp);
    setEditFollowUpDialogOpen(true);
  };


  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-12" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-20" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-12" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-warning flex items-center justify-center">
            <Clock className="w-6 h-6 text-warning-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendingFollowUps.length}</p>
            <p className="text-sm text-muted-foreground">Pending Today</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
            <User className="w-6 h-6 text-info-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{followUpStageLeads.length}</p>
            <p className="text-sm text-muted-foreground">Follow-up Stage</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{missedFollowUps.length}</p>
            <p className="text-sm text-muted-foreground">Missed</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
            <Check className="w-6 h-6 text-success-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{completedFollowUps.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>

      {/* Follow-up Stage Leads */}
      {followUpStageLeads.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-info" />
            Leads in Follow-up Stage
          </h3>
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {followUpStageLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                          {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{(lead as any).source || lead.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{lead.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{lead.property_type || '-'}</p>
                      <p className="text-xs text-muted-foreground">{(lead as any).location || (lead.city ? `${lead.city}${lead.state ? ', ' + lead.state : ''}` : '-') || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-primary">
                        {(lead as any).budget ||
                          (lead.budget_min && lead.budget_max
                            ? `$${lead.budget_min.toLocaleString()} - $${lead.budget_max.toLocaleString()}`
                            : lead.budget_min
                              ? `$${lead.budget_min.toLocaleString()}+`
                              : lead.budget_max
                                ? `Up to $${lead.budget_max.toLocaleString()}`
                                : '-'
                          )
                        }
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {format(new Date(lead.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedLeadForScheduling(lead);
                            setScheduleDialogOpen(true);
                          }}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Follow-ups */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          Today's Follow-ups
        </h3>
        {pendingFollowUps.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingFollowUps.map((followUp) => {
                  const TypeIcon = getTypeIcon(followUp.type);
                  return (
                    <tr key={followUp.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            followUp.type === 'call' ? 'bg-success/10 text-success' :
                            followUp.type === 'whatsapp' ? 'bg-info/10 text-info' :
                            followUp.type === 'meeting' ? 'bg-warning/10 text-warning' :
                            'bg-primary/10 text-primary'
                          )}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{followUp.leads?.name || 'Unknown Lead'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground capitalize">{followUp.type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{format(new Date(followUp.follow_up_date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{followUp.follow_up_time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-warning/10 text-warning">
                          {followUp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {followUp.notes ? (
                          <span className="text-sm text-muted-foreground truncate block" title={followUp.notes}>
                            {followUp.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No notes</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleMarkComplete(followUp.id)}
                            disabled={updateFollowUp.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditFollowUp(followUp)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleMarkMissed(followUp.id)}
                            disabled={updateFollowUp.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No pending follow-ups</p>
        )}
      </div>

      {/* Completed Follow-ups */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-success" />
          Completed
        </h3>
        {completedFollowUps.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {completedFollowUps.map((followUp) => {
                  const TypeIcon = getTypeIcon(followUp.type);
                  return (
                    <tr key={followUp.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            followUp.type === 'call' ? 'bg-success/10 text-success' :
                            followUp.type === 'whatsapp' ? 'bg-info/10 text-info' :
                            followUp.type === 'meeting' ? 'bg-warning/10 text-warning' :
                            'bg-primary/10 text-primary'
                          )}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{followUp.leads?.name || 'Unknown Lead'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground capitalize">{followUp.type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{format(new Date(followUp.follow_up_date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{followUp.follow_up_time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{getAssignedProfileName(followUp.assigned_to) || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-success/10 text-success">
                          {followUp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {followUp.notes ? (
                          <span className="text-sm text-muted-foreground truncate block" title={followUp.notes}>
                            {followUp.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No notes</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No completed follow-ups</p>
        )}
      </div>

      {/* Missed Follow-ups */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          Missed Follow-ups ({missedFollowUps.length})
        </h3>
        {missedFollowUps.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {missedFollowUps.map((followUp) => {
                  const TypeIcon = getTypeIcon(followUp.type);
                  return (
                    <tr key={followUp.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            followUp.type === 'call' ? 'bg-success/10 text-success' :
                            followUp.type === 'whatsapp' ? 'bg-info/10 text-info' :
                            followUp.type === 'meeting' ? 'bg-warning/10 text-warning' :
                            'bg-primary/10 text-primary'
                          )}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{followUp.leads?.name || 'Unknown Lead'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground capitalize">{followUp.type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{format(new Date(followUp.follow_up_date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{followUp.follow_up_time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{getAssignedProfileName(followUp.assigned_to) || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-destructive/10 text-destructive">
                          {followUp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {followUp.notes ? (
                          <span className="text-sm text-muted-foreground truncate block" title={followUp.notes}>
                            {followUp.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No notes</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No missed follow-ups</p>
        )}
      </div>

      {/* Schedule Follow-up Dialog */}
      <AddFollowUpDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) {
            setSelectedLeadForScheduling(null);
          }
        }}
        preSelectedLead={selectedLeadForScheduling ? {
          id: selectedLeadForScheduling.id,
          name: selectedLeadForScheduling.name
        } : undefined}
      />

      {/* Edit Follow-up Dialog */}
      <EditFollowUpDialog
        followUp={selectedFollowUpForEditing}
        open={editFollowUpDialogOpen}
        onOpenChange={(open) => {
          setEditFollowUpDialogOpen(open);
          if (!open) {
            setSelectedFollowUpForEditing(null);
          }
        }}
      />
    </div>
  );
}
