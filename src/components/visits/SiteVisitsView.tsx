import React, { useState, useMemo } from 'react';
import { useSiteVisits, SiteVisitWithDetails, useUpdateSiteVisit } from '@/hooks/useSiteVisits';
import { useLeads } from '@/hooks/useLeads';
import { useUpdateLead } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { AddSiteVisitDialog } from './AddSiteVisitDialog';
import { EditSiteVisitDialog } from './EditSiteVisitDialog';
import { Calendar, Clock, User, MessageSquare, Check, X, MapPin, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';

export function SiteVisitsView() {
  const { data: visits, isLoading: visitsLoading } = useSiteVisits();
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: profiles } = useProfiles();
  const updateVisit = useUpdateSiteVisit();
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  const [addVisitDialogOpen, setAddVisitDialogOpen] = useState(false);
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState<{ id: string; name: string } | null>(null);
  const [editVisitDialogOpen, setEditVisitDialogOpen] = useState(false);
  const [selectedVisitForEdit, setSelectedVisitForEdit] = useState<SiteVisitWithDetails | null>(null);
  const { search } = useSectionSearch();

  const isLoading = visitsLoading || leadsLoading;

  const filterVisit = (visit: SiteVisitWithDetails) =>
    filterBySearch([visit], search, (item) => [
      item.leads?.name,
      item.leads?.phone,
      item.leads?.email,
      item.properties?.title,
      item.properties?.location,
      item.feedback,
      item.status,
    ]).length > 0;

  const filterLead = (lead: { name?: string; phone?: string; email?: string; property_type?: string; location?: string }) =>
    filterBySearch([lead], search, (item) => [
      item.name,
      item.phone,
      item.email,
      item.property_type,
      item.location,
    ]).length > 0;

  const scheduledVisits = useMemo(
    () => (visits || []).filter((v) => v.status === 'scheduled').filter(filterVisit),
    [visits, search]
  );
  const completedVisits = useMemo(
    () => (visits || []).filter((v) => v.status === 'completed').filter(filterVisit),
    [visits, search]
  );
  const cancelledVisits = useMemo(
    () => (visits || []).filter((v) => v.status === 'cancelled').filter(filterVisit),
    [visits, search]
  );

  const siteVisitLeads = useMemo(
    () => (leads || []).filter((lead) => lead.stage === 'site-visit').filter(filterLead),
    [leads, search]
  );

  const handleScheduleVisit = (lead: any) => {
    setSelectedLeadForVisit({ id: lead.id, name: lead.name });
    setAddVisitDialogOpen(true);
  };

  const handleVisitScheduled = async (leadId: string) => {
    try {
      // Move the lead from 'site-visit' stage to 'negotiation' stage
      // since they now have a scheduled site visit
      await updateLead.mutateAsync({
        id: leadId,
        stage: 'negotiation'
      });

      toast({
        title: 'Lead Updated',
        description: 'Lead has been moved to negotiation stage.',
      });
    } catch (error) {
      console.error('Failed to update lead stage:', error);
      toast({
        title: 'Warning',
        description: 'Visit scheduled but failed to update lead stage.',
        variant: 'destructive',
      });
    }
  };

  const handleEditVisit = (visit: SiteVisitWithDetails) => {
    setSelectedVisitForEdit(visit);
    setEditVisitDialogOpen(true);
  };

  const handleStatusChange = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      await updateVisit.mutateAsync({ id, status });
      toast({
        title: 'Visit Updated',
        description: `Visit marked as ${status}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update visit',
        variant: 'destructive',
      });
    }
  };

  const getAssignedProfileName = (assignedTo: string | null) => {
    if (!assignedTo || !profiles) return null;
    const profile = profiles.find(p => p.user_id === assignedTo);
    return profile?.name || null;
  };


  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
<table className="w-full">

              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  </tr>
                ))}
              </tbody>
            
</table>
</div>
          </div>
        </div>
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
<table className="w-full">

              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-20" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-20" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  </tr>
                ))}
              </tbody>
            
</table>
</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Leads in Site Visit Stage */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning" />
          Leads in Site Visit Stage ({siteVisitLeads.length})
        </h3>
        {siteVisitLeads.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
<table className="w-full">

              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {siteVisitLeads.map((lead) => (
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
                      <p className="text-xs text-muted-foreground">{lead.location || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-primary">
                        {lead.budget || '-'}
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
                          onClick={() => handleScheduleVisit(lead)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleScheduleVisit(lead)}
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
        ) : (
          <p className="text-sm text-muted-foreground py-4">No leads in site visit stage</p>
        )}
      </div>

      {/* Scheduled Visits */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-info" />
          Scheduled Visits ({scheduledVisits.length})
        </h3>
        {scheduledVisits.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
<table className="w-full">

              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scheduledVisits.map((visit) => {
                  const assignedProfileName = getAssignedProfileName(visit.assigned_to);
                  return (
                    <tr key={visit.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                            {(visit.leads?.name || 'N/A').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{visit.leads?.name || 'Unknown Lead'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{visit.properties?.title || 'Unknown Property'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{format(new Date(visit.visit_date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{visit.visit_time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{assignedProfileName || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          'bg-info/10 text-info'
                        )}>
                          {visit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {}}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditVisit(visit)}
                            disabled={updateVisit.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleStatusChange(visit.id, 'completed')}
                            disabled={updateVisit.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleStatusChange(visit.id, 'cancelled')}
                            disabled={updateVisit.isPending}
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
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No scheduled visits</p>
        )}
      </div>

      {/* Completed Visits */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          Completed ({completedVisits.length})
        </h3>
        {completedVisits.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
<table className="w-full">

              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {completedVisits.map((visit) => {
                  const assignedProfileName = getAssignedProfileName(visit.assigned_to);
                  return (
                    <tr key={visit.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                            {(visit.leads?.name || 'N/A').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{visit.leads?.name || 'Unknown Lead'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{visit.properties?.title || 'Unknown Property'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{format(new Date(visit.visit_date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{visit.visit_time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{assignedProfileName || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          'bg-success/10 text-success'
                        )}>
                          {visit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {visit.feedback ? (
                          <span className="text-sm text-muted-foreground truncate block" title={visit.feedback}>
                            {visit.feedback}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No feedback</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            
</table>
</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No completed visits</p>
        )}
      </div>

      {/* Cancelled Visits */}
      {cancelledVisits.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Cancelled ({cancelledVisits.length})
          </h3>
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
<table className="w-full">

              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cancelledVisits.map((visit) => {
                  const assignedProfileName = getAssignedProfileName(visit.assigned_to);
                  return (
                    <tr key={visit.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                            {(visit.leads?.name || 'N/A').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{visit.leads?.name || 'Unknown Lead'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{visit.properties?.title || 'Unknown Property'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{format(new Date(visit.visit_date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{visit.visit_time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{assignedProfileName || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          'bg-destructive/10 text-destructive'
                        )}>
                          {visit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {visit.feedback ? (
                          <span className="text-sm text-muted-foreground truncate block" title={visit.feedback}>
                            {visit.feedback}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No feedback</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            
</table>
</div>
          </div>
        </div>
      )}

      {/* Add Site Visit Dialog */}
      <AddSiteVisitDialog
        open={addVisitDialogOpen}
        onOpenChange={setAddVisitDialogOpen}
        preSelectedLead={selectedLeadForVisit || undefined}
        onVisitScheduled={handleVisitScheduled}
      />

      {/* Edit Site Visit Dialog */}
      <EditSiteVisitDialog
        visit={selectedVisitForEdit}
        open={editVisitDialogOpen}
        onOpenChange={setEditVisitDialogOpen}
      />
    </div>
  );
}
