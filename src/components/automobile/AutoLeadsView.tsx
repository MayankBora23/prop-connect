import { useState, useMemo } from 'react';
import { AutoLeadPipeline } from './AutoLeadPipeline';
import { useAutoLeads, useCreateAutoLead, useUpdateAutoLead, useDeleteAutoLead, type AutoLead } from '@/hooks/useAutoLeads';
import { LayoutGrid, List, Filter, Download, Upload, MessageCircle, Phone, History, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LeadHistorySheet } from '@/components/history/LeadHistorySheet';
import { useCreateWhatsAppConversation } from '@/hooks/useWhatsApp';
import { useProfiles } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';
import { EditAutoLeadDialog } from './EditAutoLeadDialog';
import { format } from 'date-fns';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';
import { ImportCSVDialog } from '@/components/leads/ImportCSVDialog';
import type { FieldDef } from '@/components/leads/ImportCSVDialog';
import { generateCSV, downloadCSV, normalizePhone } from '@/lib/csvUtils';

const AUTO_LEAD_FIELD_DEFS: FieldDef[] = [
  { key: 'Name', label: 'Name', required: true, aliases: ['name', 'fullname', 'leadname', 'customername', 'clientname', 'contactname', 'firstname'] },
  { key: 'Phone', label: 'Phone / Mobile', required: true, aliases: ['phone', 'phoneno', 'phonenumber', 'mobile', 'mobileno', 'mobilenumber', 'contact', 'contactno', 'cell', 'whatsapp', 'ph', 'number'] },
  { key: 'Email', label: 'Email', required: false, aliases: ['email', 'emailaddress', 'emailid', 'mail'] },
  { key: 'Vehicle Type', label: 'Vehicle Type (car/bike)', required: false, aliases: ['vehicletype', 'type', 'preferredvehicletype', 'vehiclecategory'] },
  { key: 'Brand', label: 'Preferred Brand', required: false, aliases: ['brand', 'preferredbrand', 'make', 'carbrand', 'vehiclebrand'] },
  { key: 'Model', label: 'Preferred Model', required: false, aliases: ['model', 'preferredmodel', 'carmodel', 'vehiclemodel'] },
  { key: 'Budget Min', label: 'Budget Min', required: false, aliases: ['budgetmin', 'minbudget', 'budgetfrom', 'budgetlow'] },
  { key: 'Budget Max', label: 'Budget Max', required: false, aliases: ['budgetmax', 'maxbudget', 'budgetto', 'budget'] },
  { key: 'Source', label: 'Source', required: false, aliases: ['source', 'leadsource', 'referral', 'channel'] },
  { key: 'Status', label: 'Status / Stage', required: false, aliases: ['status', 'state', 'stage', 'leadstatus', 'leadstage'] },
];

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

function AssignLeadSelect({ leadId, assignedTo }: { leadId: string, assignedTo?: string }) {
  const { data: profiles, isLoading } = useProfiles();
  const updateLead = useUpdateAutoLead();

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

const statusOptions = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'test_drive_scheduled', label: 'Test Drive Scheduled' },
  { value: 'quotation_shared', label: 'Quotation Shared' },
  { value: 'negotiation_final_discussion', label: 'Negotiation / Final Discussion' },
  { value: 'booking_done', label: 'Booking Done' },
  { value: 'delivered_sold', label: 'Delivered / Sold' },
];

function StatusSelect({ leadId, status } : { leadId: string, status: string }) {
  const updateLead = useUpdateAutoLead();
  return (
    <Select
      value={status || 'new'}
      onValueChange={value => updateLead.mutate({ id: leadId, status: value })}
      disabled={updateLead.isPending}
    >
      <SelectTrigger className="h-7 w-36 text-xs bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AutoLeadsView() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const { data: leads, isLoading } = useAutoLeads();
  const deleteLead = useDeleteAutoLead();
  const createLead = useCreateAutoLead();
  const createWhatsAppConversation = useCreateWhatsAppConversation();
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<AutoLead | null>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [selectedHistoryLeadId, setSelectedHistoryLeadId] = useState<string | null>(null);
  const [selectedHistoryLeadName, setSelectedHistoryLeadName] = useState('');
  const { search } = useSectionSearch();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const filteredLeads = useMemo(
    () =>
      filterBySearch(leads, search, (lead) => [
        lead.name,
        lead.phone,
        lead.email,
        lead.preferred_brand,
        lead.preferred_model,
        lead.budget_min != null ? String(lead.budget_min) : undefined,
        lead.budget_max != null ? String(lead.budget_max) : undefined,
        lead.status,
        lead.source,
      ]),
    [leads, search]
  );

  const handleDelete = async (leadId: string, leadName: string) => {
    try {
      await deleteLead.mutateAsync(leadId);
      toast.success(`${leadName} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${leadName}`);
    }
  };

  const handleEditLead = (lead: AutoLead) => {
    setSelectedLead(lead);
    setEditLeadOpen(true);
  };

  const checkExistingConversation = async (phoneNumber: string, companyId: string) => {
    const { data, error } = await supabaseAny
      .from('whatsapp_conversations')
      .select('*')
      .eq('contact_phone', phoneNumber)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  };

  const updateConversationName = async (conversationId: string, name: string) => {
    const { error } = await supabaseAny
      .from('whatsapp_conversations')
      .update({ contact_name: name })
      .eq('id', conversationId);

    if (error) throw error;
  };

  const handleAddToWhatsApp = async (lead: AutoLead) => {
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

      toast.success(`Lead ${lead.name} added to WhatsApp inbox`);
    } catch (error) {
      console.error('Error adding lead to WhatsApp:', error);
      toast.error('Failed to add lead to WhatsApp');
    }
  };

  const updateLeadMutation = useUpdateAutoLead();

  const handleAddToTelephony = async (lead: AutoLead) => {
    try {
      await updateLeadMutation.mutateAsync({
        id: lead.id,
        is_telephony_enabled: true
      });
      toast.success('Lead enabled for telephony');
    } catch (error) {
      console.error('Error enabling telephony for lead:', error);
      toast.error('Failed to enable telephony for lead');
    }
  };

  const handleImport = async (data: Record<string, string>[]) => {
    let successCount = 0;
    const errors: string[] = [];

    for (const row of data) {
      // Rows are pre-keyed by the column-mapping dialog (canonical keys)
      const name = row['Name'];
      const phone = row['Phone'];
      const email = row['Email'];
      const vehicle_type = row['Vehicle Type'];
      const brand = row['Brand'];
      const model = row['Model'];
      const budget_min = row['Budget Min'];
      const budget_max = row['Budget Max'];
      const source = row['Source'];
      const status = row['Status'];

      if (!name || !phone) {
        errors.push(`Row missing required fields (Name and Phone)`);
        continue;
      }

      // Normalise vehicle type
      const normalizedType = vehicle_type && ['car', 'bike'].includes(vehicle_type.toLowerCase())
        ? (vehicle_type.toLowerCase() as 'car' | 'bike')
        : null;

      const validStatuses = ['new_lead', 'contacted', 'test_drive_scheduled', 'quotation_shared', 'negotiation_final_discussion', 'booking_done', 'delivered_sold'];
      const normalizedStatus = status && validStatuses.includes(status.toLowerCase().replace(/[\s-]+/g, '_'))
        ? status.toLowerCase().replace(/[\s-]+/g, '_')
        : 'new_lead';

      try {
        await createLead.mutateAsync({
          name: name.trim(),
          phone: normalizePhone(phone),
          email: email?.trim() || null,
          preferred_vehicle_type: normalizedType,
          preferred_brand: brand?.trim() || null,
          preferred_model: model?.trim() || null,
          budget_min: budget_min ? Number(budget_min) : null,
          budget_max: budget_max ? Number(budget_max) : null,
          financing_needed: false,
          insurance_needed: false,
          test_drive_requested: false,
          source: source?.trim() || 'CSV Import',
          status: normalizedStatus,
          notes: [],
          tags: []
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Failed to import ${name}: ${err.message || 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.error(errors);
      if (successCount === 0) {
        throw new Error(`All imports failed. e.g. ${errors[0]}`);
      } else {
        toast.warning(`Imported ${successCount} leads, but ${errors.length} failed.`);
      }
    }
  };

  const handleExport = () => {
    if (!filteredLeads || filteredLeads.length === 0) {
      toast.error('No leads available to export');
      return;
    }
    const headers = [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'preferred_vehicle_type', label: 'Preferred Vehicle Type' },
      { key: 'preferred_brand', label: 'Preferred Brand' },
      { key: 'preferred_model', label: 'Preferred Model' },
      { key: 'budget_min', label: 'Budget Min' },
      { key: 'budget_max', label: 'Budget Max' },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created At' },
    ];
    const formattedLeads = filteredLeads.map(lead => ({
      ...lead,
      phone: lead.phone ? `\u200B${lead.phone}` : '',
      created_at: lead.created_at ? format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    }));
    const csvContent = generateCSV(headers, formattedLeads);
    downloadCSV(csvContent, 'automobile_leads.csv');
    toast.success('Leads exported successfully');
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
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <ImportCSVDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        sampleHeaders={['Name', 'Phone', 'Email', 'Preferred Vehicle Type', 'Preferred Brand', 'Preferred Model', 'Budget Min', 'Budget Max', 'Source', 'Status']}
        fieldDefs={AUTO_LEAD_FIELD_DEFS}
        title="Import Automobile Leads"
        templateFileName="automobile_leads_template.csv"
      />

      {/* Content */}
      {viewMode === 'pipeline' ? (
        <AutoLeadPipeline
          onOpenHistory={(lead) => {
            setSelectedHistoryLeadId(lead.id);
            setSelectedHistoryLeadName(lead.name);
            setHistorySheetOpen(true);
          }}
        />
      ) : (
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interest</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
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
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  </tr>
                ))
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {search.trim() ? 'No leads match your search.' : 'No leads found. Add your first lead to get started.'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
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
                      <p className="text-sm text-foreground">{lead.preferred_brand || '-'}</p>
                      <p className="text-xs text-muted-foreground">{lead.preferred_model || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-primary">
                        {lead.budget_min && lead.budget_max
                          ? `₹${lead.budget_min.toLocaleString()} - ₹${lead.budget_max.toLocaleString()}`
                          : '-'
                        }
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <AssignLeadSelect leadId={lead.id} assignedTo={lead.assigned_to} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect leadId={lead.id} status={lead.status || 'new'} />
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {format(new Date(lead.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <TooltipProvider>
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedHistoryLeadId(lead.id);
                                  setSelectedHistoryLeadName(lead.name);
                                  setHistorySheetOpen(true);
                                }}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View History</TooltipContent>
                          </Tooltip>
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
                            handleEditLead(lead);
                          }}
                          title="Edit Lead"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                      </TooltipProvider>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Auto Lead Dialog */}
      <EditAutoLeadDialog
        lead={selectedLead}
        open={editLeadOpen}
        onOpenChange={(open) => {
          setEditLeadOpen(open);
          if (!open) setSelectedLead(null);
        }}
      />

      <LeadHistorySheet
        leadId={selectedHistoryLeadId ?? ''}
        leadType="automobile"
        leadName={selectedHistoryLeadName}
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
      />
    </div>
  );
}
