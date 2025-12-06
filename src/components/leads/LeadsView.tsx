import { useState, useMemo } from 'react';
import { LeadPipeline } from './LeadPipeline';
import { ImportLeadsDialog } from './ImportLeadsDialog';
import { LeadForm } from './LeadForm';
import { LeadFiltersDialog, type LeadFilters } from './LeadFilters';
import { LayoutGrid, List, Filter, Download, Upload, Plus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLeads, useCreateLeadsBatch, useCreateLead, useUpdateLead } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { exportLeadsToCSV, downloadCSV } from '@/lib/csvUtils';
import type { Lead } from '@/data/mockData';

export function LeadsView() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<LeadFilters>({
    search: '',
    stage: '',
    source: '',
    assignedTo: '',
  });
  const { data: leads = [], isLoading } = useLeads();
  const createLeadsBatch = useCreateLeadsBatch();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  // Filter leads based on active filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          lead.name.toLowerCase().includes(searchLower) ||
          lead.email.toLowerCase().includes(searchLower) ||
          lead.phone.toLowerCase().includes(searchLower) ||
          lead.location?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.stage && lead.stage !== filters.stage) return false;
      if (filters.source && lead.source !== filters.source) return false;
      if (filters.assignedTo && lead.assignedTo !== filters.assignedTo) return false;
      return true;
    });
  }, [leads, filters]);

  const handleExport = () => {
    try {
      const csvContent = exportLeadsToCSV(leads);
      const filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
      toast({
        title: 'Success',
        description: `Exported ${leads.length} lead(s) to CSV`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export leads',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (importedLeads: Partial<Lead>[]) => {
    try {
      // Prepare leads with defaults
      const preparedLeads = importedLeads.map((lead) => ({
        ...lead,
        stage: lead.stage || 'new',
        tags: lead.tags || [],
        notes: lead.notes || [],
        createdAt: lead.createdAt || new Date().toISOString().split('T')[0],
        lastContact: lead.lastContact || new Date().toISOString().split('T')[0],
      }));

      // Create leads in batch
      await createLeadsBatch.mutateAsync(preparedLeads);
      toast({
        title: 'Success',
        description: `Imported ${importedLeads.length} lead(s) successfully`,
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to import leads');
    }
  };

  const handleSubmitLead = async (data: Partial<Lead>) => {
    try {
      if (editingLead) {
        await updateLead.mutateAsync({ id: editingLead.id, data });
        toast({ title: 'Success', description: 'Lead updated successfully' });
      } else {
        await createLead.mutateAsync(data);
        toast({ title: 'Success', description: 'Lead created successfully' });
      }
      setFormOpen(false);
      setEditingLead(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save lead',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const hasActiveFilters = filters.search || filters.stage || filters.source || filters.assignedTo;

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading leads...</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, email, phone..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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
          <Button
            variant={hasActiveFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-primary-foreground text-primary text-xs px-1.5 py-0.5 rounded-full">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={leads.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export ({leads.length})
          </Button>
          <Button size="sm" onClick={() => { setEditingLead(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-secondary/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.search && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
              Search: {filters.search}
              <button
                onClick={() => setFilters({ ...filters, search: '' })}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.stage && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
              Stage: {filters.stage}
              <button
                onClick={() => setFilters({ ...filters, stage: '' })}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.source && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
              Source: {filters.source}
              <button
                onClick={() => setFilters({ ...filters, source: '' })}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.assignedTo && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
              Agent: {filters.assignedTo}
              <button
                onClick={() => setFilters({ ...filters, assignedTo: '' })}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setFilters({ search: '', stage: '', source: '', assignedTo: '' })}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'pipeline' ? (
        <LeadPipeline
          leads={filteredLeads}
          onEditLead={(lead) => {
            setEditingLead(lead);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {hasActiveFilters ? 'No leads match the current filters' : 'No leads found'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setEditingLead(lead);
                    setFormOpen(true);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {lead.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.source}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{lead.phone}</p>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{lead.propertyType}</p>
                    <p className="text-xs text-muted-foreground">{lead.location}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-primary">{lead.budget}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full font-medium',
                      lead.stage === 'new' ? 'bg-info/10 text-info' :
                      lead.stage === 'contacted' ? 'bg-primary/10 text-primary' :
                      lead.stage === 'site-visit' ? 'bg-warning/10 text-warning' :
                      lead.stage === 'negotiation' ? 'bg-success/10 text-success' :
                      lead.stage === 'closed-won' ? 'bg-success/10 text-success' :
                      lead.stage === 'closed-lost' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {lead.stage.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{lead.assignedTo}</td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ImportLeadsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />

      <LeadForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLead(null);
        }}
        lead={editingLead}
        onSubmit={handleSubmitLead}
      />

      <LeadFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        leads={leads}
      />
    </div>
  );
}
