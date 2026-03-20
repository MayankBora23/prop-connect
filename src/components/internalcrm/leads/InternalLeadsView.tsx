import { useState, useMemo } from 'react';
import { InternalLeadPipeline } from './InternalLeadPipeline';
import { AddInternalLeadDialog } from './AddInternalLeadDialog';
import { EditInternalLeadDialog } from './EditInternalLeadDialog';
import { ScheduleDemoDialog } from '../ScheduleDemoDialog';
import { useInternalLeads, type InternalLead, useDeleteInternalLead, useUpdateInternalLead } from '@/hooks/useInternalLeads';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Plus,
  MessageCircle,
  Phone,
  Edit2,
  Trash2,
  Download,
  Upload,
  Clock3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Enums } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useCreateWhatsAppConversation } from '@/hooks/useWhatsApp';
import { useCurrentCompany } from '@/hooks/useCompany';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const internalStageOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'demo_scheduled', label: 'Demo Scheduled' },
  { value: 'trial_started', label: 'Trial Started' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
] as const;

function InternalStageSelect({ leadId, stage }: { leadId: string, stage: string }) {
  const updateLead = useUpdateInternalLead();

  return (
    <Select
      value={stage}
      onValueChange={(value) => updateLead.mutate({ id: leadId, stage: value as any })}
      disabled={updateLead.isPending}
    >
      <SelectTrigger className="h-7 w-36 text-xs bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {internalStageOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function InternalLeadsView() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState<Enums<'industry_type'> | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<'all' | string>('all');
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDialogInitialTab, setEditDialogInitialTab] = useState<'details' | 'history'>('details');
  const [selectedLead, setSelectedLead] = useState<InternalLead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<InternalLead | null>(null);

  const { data: leads, isLoading } = useInternalLeads();
  const deleteLead = useDeleteInternalLead();
  const updateLead = useUpdateInternalLead();
  const createWhatsAppConversation = useCreateWhatsAppConversation();
  const { data: company } = useCurrentCompany();

  const filteredLeads = useMemo(() => {
    return (leads || []).filter((lead) => {
      const matchesSearch =
        !search ||
        lead.company_name.toLowerCase().includes(search.toLowerCase()) ||
        lead.lead_name.toLowerCase().includes(search.toLowerCase()) ||
        (lead.phone_no ?? '').toLowerCase().includes(search.toLowerCase());

      const matchesIndustry = industryFilter === 'all' || lead.industry === industryFilter;
      const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;

      return matchesSearch && matchesIndustry && matchesStage;
    });
  }, [leads, search, industryFilter, stageFilter]);

  const industries: { value: Enums<'industry_type'>; label: string }[] = [
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'education', label: 'Education' },
    { value: 'automobile_dealers', label: 'Automobile Dealers' },
    { value: 'internal_crm', label: 'Internal CRM' },
  ];

  const handleEdit = (lead: InternalLead) => {
    setSelectedLead(lead);
    setEditDialogInitialTab('details');
    setIsEditDialogOpen(true);
  };

  const handleHistory = (lead: InternalLead) => {
    setSelectedLead(lead);
    setEditDialogInitialTab('history');
    setIsEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!leadToDelete) return;
    try {
      await deleteLead.mutateAsync(leadToDelete.id);
      toast.success(`${leadToDelete.company_name} lead deleted successfully`);
      setLeadToDelete(null);
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleWhatsApp = async (lead: InternalLead) => {
    try {
      if (!lead.phone_no) {
        toast.error('Lead does not have a phone number');
        return;
      }

      if (!company) {
        toast.error('Company information not found');
        return;
      }

      const phoneNumber = lead.phone_no.startsWith('+91') ? lead.phone_no : `+91${lead.phone_no}`;

      await createWhatsAppConversation.mutateAsync({
        contact_phone: phoneNumber,
        contact_name: `${lead.company_name} (${lead.lead_name})`,
        company_id: company.id,
        last_message_at: new Date().toISOString(),
      });
      toast.success(`${lead.lead_name} added to WhatsApp inbox`);
    } catch (error: any) {
      console.error('Error adding internal lead to WhatsApp:', error);
      toast.error('Failed to add lead to WhatsApp');
    }
  };

  const handleTelephony = async (lead: InternalLead) => {
    try {
      if (!lead.phone_no) {
        toast.error('Lead does not have a phone number');
        return;
      }

      await updateLead.mutateAsync({
        id: lead.id,
        is_telephony_enabled: true
      });
      toast.success(`${lead.lead_name} successfully added to the Telephony queue.`);
    } catch (error) {
      console.error('Error adding internal lead to telephony:', error);
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
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-9 w-64 bg-background"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
        <InternalLeadPipeline
          onEditLead={handleEdit}
          onWhatsApp={handleWhatsApp}
          onTelephony={handleTelephony}
        />
      ) : (
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company & Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Users</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Added On</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-7 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                    </tr>
                  ))
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No internal CRM leads found. Build your pipeline by adding a lead.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-secondary/50 transition-colors cursor-pointer group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shrink-0">
                            {lead.company_name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{lead.company_name}</p>
                            <p className="text-xs text-muted-foreground">{lead.lead_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{lead.phone_no || '-'}</p>
                        <p className="text-xs text-muted-foreground">{lead.address || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                          {lead.industry.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-primary">
                        {lead.user_limit ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <InternalStageSelect leadId={lead.id} stage={lead.stage} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={(e) => { e.stopPropagation(); handleWhatsApp(lead); }}
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={(e) => { e.stopPropagation(); handleTelephony(lead); }}
                            title="Telephony"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => { e.stopPropagation(); handleHistory(lead); }}
                            title="History"
                          >
                            <Clock3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); setLeadToDelete(lead); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EditInternalLeadDialog
        lead={selectedLead}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialTab={editDialogInitialTab}
      />

      <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lead for <strong>{leadToDelete?.company_name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

