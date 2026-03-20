import { useState } from 'react';
import { LeadPipeline } from './LeadPipeline';
import { useLeads } from '@/hooks/useLeads';
import { LayoutGrid, List, Filter, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

import { useProfiles } from '@/hooks/useProfiles';
import { useUpdateLead, useDeleteLead } from '@/hooks/useLeads';
import { useCreateWhatsAppConversation } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditLeadDialog } from './EditLeadDialog';
import { Edit, Trash2, MessageCircle, Phone, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';
import type { Lead } from '@/hooks/useLeads';

function LeadStatusSelect({ leadId, leadStatus }: { leadId: string, leadStatus?: Enums<'lead_status'> }) {
  const updateLead = useUpdateLead();

  const getStatusColor = (status: Enums<'lead_status'>) => {
    switch (status) {
      case 'hot': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'warm': return 'bg-warning/10 text-warning border-warning/20';
      case 'cold': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Select
      value={leadStatus || 'cold'}
      onValueChange={value => updateLead.mutate({ id: leadId, lead_status: value as Enums<'lead_status'> })}
      disabled={updateLead.isPending}
    >
      <SelectTrigger className={`h-7 w-20 text-xs border ${getStatusColor(leadStatus || 'cold')}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="hot">Hot</SelectItem>
        <SelectItem value="warm">Warm</SelectItem>
        <SelectItem value="cold">Cold</SelectItem>
      </SelectContent>
    </Select>
  );
}

function AssignLeadSelect({ leadId, assignedTo }: { leadId: string, assignedTo?: string }) {
  const { data: profiles, isLoading } = useProfiles();
  const updateLead = useUpdateLead();

  return (
    <Select
      value={assignedTo ?? 'unassigned'}
      onValueChange={value => {
        updateLead.mutate({ id: leadId, assigned_to: value === 'unassigned' ? null : value });
      }}
      disabled={isLoading || updateLead.isPending}
    >
      <SelectTrigger className="h-7 w-40 text-xs bg-background">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {(profiles || []).map(profile => (
          <SelectItem key={profile.user_id} value={profile.user_id}>
            {profile.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const stageOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'site-visit', label: 'Site Visit' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed-won', label: 'Closed Won' },
  { value: 'closed-lost', label: 'Closed Lost' },
];

function StageSelect({ leadId, stage } : { leadId: string, stage: Enums<'lead_stage'> }) {
  const updateLead = useUpdateLead();
  return (
    <Select
      value={stage}
      onValueChange={value => updateLead.mutate({ id: leadId, stage: value as Enums<'lead_stage'> })}
      disabled={updateLead.isPending}
    >
      <SelectTrigger className="h-7 w-36 text-xs bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {stageOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LeadsView() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogInitialTab, setEditDialogInitialTab] = useState<'details' | 'history'>('details');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { data: leads, isLoading } = useLeads();
  const deleteLead = useDeleteLead();
  const createWhatsAppConversation = useCreateWhatsAppConversation();

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setEditDialogInitialTab('details');
    setEditDialogOpen(true);
  };

  const handleHistory = (lead: Lead) => {
    setSelectedLead(lead);
    setEditDialogInitialTab('history');
    setEditDialogOpen(true);
  };

  const handleDelete = async (leadId: string, leadName: string) => {
    try {
      await deleteLead.mutateAsync(leadId);
      toast.success(`${leadName} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${leadName}`);
    }
  };

  const checkExistingConversation = async (phoneNumber: string, companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, contact_name')
        .eq('contact_phone', phoneNumber)
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing conversation:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in checkExistingConversation:', error);
      return null;
    }
  };

  const updateConversationName = async (conversationId: string, contactName: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ contact_name: contactName })
        .eq('id', conversationId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating conversation name:', error);
      throw error;
    }
  };

  const handleAddToWhatsApp = async (lead: Lead) => {
    try {
      // Validate required fields
      if (!lead.phone || !lead.name) {
        toast.error('Lead phone and name are required');
        return;
      }

      // Validate company_id
      if (!lead.company_id) {
        toast.error('Lead company information is missing');
        return;
      }

      // Format phone number with +91 country code if not already present
      const phoneNumber = lead.phone.startsWith('+91') ? lead.phone : `+91${lead.phone}`;

      // Check if conversation with this phone number already exists
      const existingConversation = await checkExistingConversation(phoneNumber, lead.company_id);

      if (existingConversation) {
        // If conversation exists but has no name, update it
        if (!existingConversation.contact_name || existingConversation.contact_name.trim() === '') {
          await updateConversationName(existingConversation.id, lead.name);
          toast.success(`Contact name updated for ${phoneNumber}`);
        } else {
          // If conversation exists and already has a name, show message
          toast.info(`Contact ${phoneNumber} already exists in WhatsApp inbox`);
        }
        return;
      }

      // Create new conversation if it doesn't exist
      await createWhatsAppConversation.mutateAsync({
        contact_phone: phoneNumber,
        contact_name: lead.name,
        company_id: lead.company_id,
        last_message_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error adding lead to WhatsApp:', error);
      toast.error('Failed to add lead to WhatsApp');
    }
  };

  const updateLead = useUpdateLead();

  const handleAddToTelephony = async (lead: Lead) => {
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        is_telephony_enabled: true
      });
      toast.success('Lead successfully added to the Telephony queue.');
    } catch (error) {
      console.error('Error adding lead to telephony:', error);
      toast.error('Failed to add lead to Telephony queue');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'pipeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pipeline')}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Pipeline
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'pipeline' ? (
        <LeadPipeline />
      ) : (
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  </tr>
                ))
              ) : (leads || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No leads found. Add your first lead to get started.
                  </td>
                </tr>
              ) : (
                (leads || []).map((lead) => (
                  <tr key={lead.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                          {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.source || 'Unknown'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{lead.phone}</p>
                      <p className="text-xs text-muted-foreground">{lead.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{lead.property_type || '-'}</p>
                      <p className="text-xs text-muted-foreground">{lead.location || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-primary">{lead.budget || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <AssignLeadSelect leadId={lead.id} assignedTo={lead.assigned_to} />
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusSelect leadId={lead.id} leadStatus={lead.lead_status} />
                    </td>
                    <td className="px-4 py-3">
                      <StageSelect leadId={lead.id} stage={lead.stage} />
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {format(new Date(lead.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWhatsApp(lead);
                          }}
                          title="Add to WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToTelephony(lead);
                          }}
                          title="Add to Telephony"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(lead);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHistory(lead);
                          }}
                          title="History"
                        >
                          <Clock3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {lead.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(lead.id, lead.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <EditLeadDialog
        lead={selectedLead}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        initialTab={editDialogInitialTab}
      />
    </div>
  );
}
