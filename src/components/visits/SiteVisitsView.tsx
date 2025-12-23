import React, { useState } from 'react';
import { useSiteVisits, SiteVisitWithDetails, useUpdateSiteVisit } from '@/hooks/useSiteVisits';
import { useLeads } from '@/hooks/useLeads';
import { useUpdateLead } from '@/hooks/useLeads';
import { AddSiteVisitDialog } from './AddSiteVisitDialog';
import { EditSiteVisitDialog } from './EditSiteVisitDialog';
import { Calendar, Clock, User, MessageSquare, Check, X, MapPin, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function SiteVisitsView() {
  const { data: visits, isLoading: visitsLoading } = useSiteVisits();
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const updateVisit = useUpdateSiteVisit();
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  const [addVisitDialogOpen, setAddVisitDialogOpen] = useState(false);
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState<{ id: string; name: string } | null>(null);
  const [editVisitDialogOpen, setEditVisitDialogOpen] = useState(false);
  const [selectedVisitForEdit, setSelectedVisitForEdit] = useState<SiteVisitWithDetails | null>(null);

  const isLoading = visitsLoading || leadsLoading;

  const scheduledVisits = (visits || []).filter(v => v.status === 'scheduled');
  const completedVisits = (visits || []).filter(v => v.status === 'completed');
  const cancelledVisits = (visits || []).filter(v => v.status === 'cancelled');

  // Filter leads that are in site-visit stage
  const siteVisitLeads = (leads || []).filter(lead => lead.stage === 'site-visit');

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

  const VisitCard = ({ visit, onEdit }: { visit: SiteVisitWithDetails; onEdit?: (visit: SiteVisitWithDetails) => void }) => (
    <div className="card-elevated p-4 animate-scale-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {(visit.leads?.name || 'N/A').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{visit.leads?.name || 'Unknown Lead'}</h4>
            <p className="text-xs text-muted-foreground">{visit.properties?.title || 'Unknown Property'}</p>
          </div>
        </div>
        <span className={cn(
          'text-xs px-2 py-1 rounded-full font-medium',
          visit.status === 'scheduled' ? 'bg-info/10 text-info' :
          visit.status === 'completed' ? 'bg-success/10 text-success' :
          'bg-destructive/10 text-destructive'
        )}>
          {visit.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(visit.visit_date), 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{visit.visit_time}</span>
        </div>
      </div>

      {visit.feedback && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">{visit.feedback}</p>
        </div>
      )}

      {visit.status === 'scheduled' && (
        <div className="flex items-center gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Reminder
          </Button>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(visit)}
              disabled={updateVisit.isPending}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange(visit.id, 'completed')}
            disabled={updateVisit.isPending}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange(visit.id, 'cancelled')}
            disabled={updateVisit.isPending}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  const LeadCard = ({ lead, onScheduleVisit }: { lead: any; onScheduleVisit: (lead: any) => void }) => (
    <div className="card-elevated p-4 animate-scale-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{lead.name}</h4>
            <p className="text-xs text-muted-foreground">{lead.source || 'Unknown Source'}</p>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-warning/10 text-warning">
          Site Visit Stage
        </span>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{lead.phone}</span>
        </div>
        {lead.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{lead.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{lead.property_type || 'Not specified'}</span>
          <span className="text-xs font-semibold text-primary">{lead.budget || 'No budget'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onScheduleVisit(lead)}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Schedule Visit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onScheduleVisit(lead)}
        >
          <Calendar className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {siteVisitLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onScheduleVisit={handleScheduleVisit} />
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledVisits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} onEdit={handleEditVisit} />
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedVisits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cancelledVisits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
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
