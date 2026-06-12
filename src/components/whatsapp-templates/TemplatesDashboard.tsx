import { useState } from 'react';
import { useTemplates, useSyncTemplates, useDeleteTemplate, useSubmitTemplate, useTemplateAnalytics, WhatsAppTemplate } from '@/hooks/useWhatsAppTemplates';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { TemplateLibrary } from './TemplateLibrary';
import { TemplateBuilder } from './TemplateBuilder';
import { CampaignSender } from './CampaignSender';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  FileCheck, 
  FileText, 
  Clock, 
  AlertTriangle, 
  RotateCw, 
  Plus, 
  Copy, 
  Trash2, 
  Send, 
  SlidersHorizontal,
  ChevronRight,
  Info,
  Building,
  CheckCircle,
  HelpCircle,
  Megaphone,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TemplatesDashboard() {
  const { data: company, isLoading: companyLoading } = useCurrentCompany();
  const { data: profile } = useCurrentProfile();
  
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { data: analyticsData } = useTemplateAnalytics();
  
  const syncMutation = useSyncTemplates();
  const deleteMutation = useDeleteTemplate();
  const submitMutation = useSubmitTemplate();

  // Active view: 'list' | 'library' | 'builder' | 'campaign'
  const [view, setView] = useState<'list' | 'library' | 'builder' | 'campaign'>('list');
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [prefilledLibraryTemplate, setPrefilledLibraryTemplate] = useState<any | null>(null);

  // Listing filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Role permissions: Admin / Super Admin / Manager can manage. Sales can only read / use.
  const userRole = profile?.role;
  const isAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager';

  // Meta WABA connection check
  const isMetaConnected = company?.whatsapp_provider === 'meta' && !!company?.meta_waba_id;

  const handleSync = async () => {
    toast.loading('Syncing template statuses from Meta...', { id: 'sync-status' });
    try {
      const res = await syncMutation.mutateAsync();
      toast.success(res.message || 'Sync completed successfully!', { id: 'sync-status' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync templates.', { id: 'sync-status' });
    }
  };

  const handleSubmit = async (id: string) => {
    toast.loading('Submitting template for review...', { id: 'submit' });
    try {
      await submitMutation.mutateAsync(id);
      toast.success('Submitted successfully!', { id: 'submit' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit template.', { id: 'submit' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template? This cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Template deleted successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template.');
    }
  };

  const handleClone = async (template: WhatsAppTemplate) => {
    const newName = `${template.template_name}_copy`;
    const checkName = window.prompt('Enter name for the cloned template (lowercase and underscores only):', newName);
    if (checkName === null) return;
    
    if (!checkName.trim()) {
      toast.error('Template name cannot be empty.');
      return;
    }

    try {
      // Invoke clone API
      const { data, error } = await supabase.functions.invoke('whatsapp-templates/clone', {
        method: 'POST',
        body: { templateId: template.id, newName: checkName }
      });
      if (error) throw error;
      toast.success(`Template cloned successfully as draft: ${checkName}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clone template.');
    }
  };

  // Helper for rendering status badges
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      pending: { label: 'Pending Meta Review', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      rejected: { label: 'Rejected', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
      draft: { label: 'Draft', className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
      paused: { label: 'Paused', className: 'bg-amber-700/10 text-amber-700 border-amber-700/20' },
    };
    const c = map[status] || { label: status, className: 'bg-slate-500/10 text-slate-500' };
    return <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', c.className)}>{c.label}</Badge>;
  };

  // Filter logic
  const filteredTemplates = (templates || []).filter((t) => {
    const matchesSearch = t.template_name.toLowerCase().includes(search.toLowerCase()) || 
                          t.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Render builder
  if (view === 'builder') {
    return (
      <TemplateBuilder
        initialTemplate={editingTemplate}
        prefilledLibraryTemplate={prefilledLibraryTemplate}
        onBack={() => {
          setView('list');
          setEditingTemplate(null);
          setPrefilledLibraryTemplate(null);
        }}
        currentIndustry={company?.industry}
      />
    );
  }

  // Render campaign page
  if (view === 'campaign') {
    return (
      <CampaignSender
        onBack={() => setView('list')}
        currentIndustry={company?.industry}
      />
    );
  }

  // Stats numbers from analytics hook
  const stats = analyticsData?.stats || { total: 0, approved: 0, pending: 0, rejected: 0, draft: 0 };
  const mockPerformance = analyticsData?.analytics || { mostUsed: [], campaignUsage: [] };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sandbox Fallback Banner */}
      {!isMetaConnected && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex gap-3 items-start">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-600">Developer Sandbox Fallback Active</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                You have not connected a Meta WhatsApp Business Account (WABA) in Company Settings. 
                We have activated a simulator so you can create, submit, sync, and send templates. 
                Configure Meta keys under <strong>Company Settings</strong> to go live.
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] font-semibold h-8 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 shrink-0"
              onClick={() => {
                // Emit alert to explain settings configuration
                toast.info('Go to Company Settings panel and select Meta Cloud API under WhatsApp provider to connect WABA credentials.');
              }}
            >
              Configure Meta API
            </Button>
          )}
        </div>
      )}

      {/* Analytics Summaries */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-elevated border-0 relative overflow-hidden">
          <div className="h-1 w-full bg-slate-500 absolute top-0 left-0" />
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Templates</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-slate-500">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0 relative overflow-hidden">
          <div className="h-1 w-full bg-emerald-500 absolute top-0 left-0" />
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Approved Templates</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <FileCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0 relative overflow-hidden">
          <div className="h-1 w-full bg-amber-500 absolute top-0 left-0" />
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pending Meta Review</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0 relative overflow-hidden">
          <div className="h-1 w-full bg-rose-500 absolute top-0 left-0" />
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.rejected}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Rejected templates</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Selection */}
      <div className="flex justify-between items-center border-b border-border/80 pb-3">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setView('list')}
            className={cn(
              'text-xs font-semibold px-4 h-9',
              view === 'list' ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            My Templates
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView('library')}
            className={cn(
              'text-xs font-semibold px-4 h-9',
              view === 'library' ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Template Marketplace
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            variant="outline"
            size="sm"
            disabled={syncMutation.isPending}
            className="text-xs h-9 font-semibold"
          >
            <RotateCw className={cn('w-3.5 h-3.5 mr-1.5', syncMutation.isPending && 'animate-spin')} />
            Sync Status
          </Button>
          
          <Button
            onClick={() => setView('campaign')}
            variant="outline"
            size="sm"
            className="text-xs h-9 font-semibold border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Send Broadcast Campaign
          </Button>

          {isAdmin && (
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setPrefilledLibraryTemplate(null);
                setView('builder');
              }}
              size="sm"
              className="gradient-primary border-0 text-xs h-9 font-semibold shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Template
            </Button>
          )}
        </div>
      </div>

      {/* VIEW: TEMPLATE MARKETPLACE */}
      {view === 'library' && (
        <TemplateLibrary
          onSelectTemplate={(libraryTemplate) => {
            setPrefilledLibraryTemplate(libraryTemplate);
            setEditingTemplate(null);
            setView('builder');
          }}
          currentIndustry={company?.industry}
        />
      )}

      {/* VIEW: MY TEMPLATES LISTING */}
      {view === 'list' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/80">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto flex-grow max-w-2xl">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or keyword..."
                className="text-xs h-9 font-medium"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="text-xs h-9 font-medium">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-xs h-9 font-medium">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="pending">Pending review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Templates Table */}
          <Card className="card-elevated border-0 overflow-hidden">
            <CardContent className="p-0">
              {templatesLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredTemplates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60 bg-secondary/30">
                      <TableHead className="text-xs font-bold text-muted-foreground py-3">Template Name</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Category</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Language</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Header Type</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Variables</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id} className="border-border/40 hover:bg-secondary/10">
                        <TableCell className="font-semibold text-xs py-3 text-foreground">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold">{template.template_name}</span>
                            {template.rejection_reason && (
                              <span className="text-[10px] text-rose-500 font-medium flex items-start gap-1 bg-rose-500/5 p-2 rounded border border-rose-500/10 mt-1 max-w-sm leading-normal">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                {template.rejection_reason}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded font-semibold bg-secondary/80">
                            {template.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">
                          {template.language}
                        </TableCell>
                        <TableCell>{getStatusBadge(template.status)}</TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {template.header_type}
                        </TableCell>
                        <TableCell>
                          {template.variables && template.variables.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {template.variables.map((v) => (
                                <span key={v} className="bg-primary/5 text-primary text-[9px] px-1.5 py-0.5 rounded font-mono font-medium">
                                  {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {template.status === 'draft' && isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSubmit(template.id)}
                                className="h-8 text-[10px] text-primary font-semibold hover:bg-primary/10 hover:text-primary"
                              >
                                Submit to Meta
                              </Button>
                            )}

                            {template.status === 'rejected' && isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTemplate(template);
                                  setPrefilledLibraryTemplate(null);
                                  setView('builder');
                                }}
                                className="h-8 text-[10px] text-rose-500 font-bold hover:bg-rose-500/10 hover:text-rose-600"
                              >
                                Edit & Resubmit
                              </Button>
                            )}

                            {template.status === 'draft' && isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTemplate(template);
                                  setPrefilledLibraryTemplate(null);
                                  setView('builder');
                                }}
                                className="h-8 text-[10px] font-semibold"
                              >
                                Edit
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleClone(template)}
                              className="h-8 text-[10px] font-semibold"
                            >
                              Clone
                            </Button>

                            {template.status !== 'pending' && isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(template.id)}
                                className="h-8 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1">No templates found</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Start by importing a template from our Marketplace library or click "Create Template" to draft from scratch.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PERFORMANCE ANALYTICS SECTION */}
          {mockPerformance.mostUsed.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Most used templates card */}
              <Card className="card-elevated border-0">
                <CardHeader className="pt-6 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-primary" /> Most Used Templates
                  </CardTitle>
                  <CardDescription className="text-[10px]">Templates with the highest send volume and success metrics.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-3">
                    {mockPerformance.mostUsed.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-secondary/30 border border-border/40">
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-foreground">{item.name}</h5>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-semibold">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{item.sentCount} sent</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Delivered: {item.deliveredRate} | Read: {item.readRate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Campaign stats card */}
              <Card className="card-elevated border-0">
                <CardHeader className="pt-6 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-500" /> Recent Campaign Performance
                  </CardTitle>
                  <CardDescription className="text-[10px]">Track WhatsApp delivery metrics for outbound broadcasts.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-3">
                    {mockPerformance.campaignUsage.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-secondary/30 border border-border/40">
                        <div>
                          <h5 className="text-xs font-bold text-foreground">{c.campaignName}</h5>
                          <p className="text-[10px] text-muted-foreground font-semibold">Template: {c.templateName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{c.sentCount} broadcasts</p>
                          <p className="text-[9px] text-muted-foreground font-semibold">
                            {new Date(c.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
