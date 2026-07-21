import React, { useState, useMemo } from 'react';
import { useWhatsAppTemplates, useSyncTemplates, useDeleteTemplate, useSubmitTemplate, useCloneTemplate, WhatsAppTemplate } from '@/hooks/useWhatsAppTemplates';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { TemplateBuilder } from './TemplateBuilder';
import { TemplateLibrary } from './TemplateLibrary';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  Plus,
  RefreshCw,
  MoreVertical,
  BookOpen,
  Eye,
  Edit2,
  Send,
  Trash2,
  Copy,
  AlertCircle,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';

export function TemplatesView() {
  const { data: company, isLoading: companyLoading } = useCurrentCompany();
  const { data: profile } = useCurrentProfile();
  const isAdminOrManager = ['super_admin', 'admin', 'manager'].includes(profile?.role || '');

  const { data: templates = [], isLoading: templatesLoading, refetch } = useWhatsAppTemplates();
  const syncMutation = useSyncTemplates();
  const deleteMutation = useDeleteTemplate();
  const submitMutation = useSubmitTemplate();
  const cloneMutation = useCloneTemplate();

  const [activeView, setActiveView] = useState<'list' | 'create' | 'library'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const { search } = useSectionSearch();

  if (companyLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-muted w-10 h-10 border-t-primary" />
      </div>
    );
  }

  // GATE: Meta provider only (whatsapp_provider === 'meta')
  if (!company || company.whatsapp_provider !== 'meta') {
    return (
      <Card className="max-w-xl mx-auto mt-8 border-dashed">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold">Meta Provider Required</CardTitle>
          <CardDescription className="mt-2 text-sm leading-relaxed">
            WhatsApp Message Templates are only available for companies configured with the **Meta Cloud API** provider.
            <br />
            Twilio companies do not use WhatsApp templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <p className="text-xs text-muted-foreground text-center">
            If you have a Meta Business Suite account, configure your phone number ID, WABA ID, and system user access token in settings to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      setLastSynced(new Date());
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete template "${name}"? This will delete it from Meta as well.`)) {
      try {
        await deleteMutation.mutateAsync({ id, template_name: name });
        refetch();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await submitMutation.mutateAsync(id);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClone = async (template: WhatsAppTemplate) => {
    try {
      await cloneMutation.mutateAsync(template);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  // Stats calculation
  const totalCount = templates.length;
  const approvedCount = templates.filter((t) => t.status === 'approved').length;
  const pendingCount = templates.filter((t) => t.status === 'pending').length;
  const rejectedCount = templates.filter((t) => t.status === 'rejected').length;

  const filteredTemplates = useMemo(() => {
    const statusFiltered = templates.filter((t) => {
      if (statusFilter === 'all') return true;
      return t.status === statusFilter;
    });
    return filterBySearch(statusFiltered, search, (template) => [
      template.template_name,
      template.category,
      template.language,
      template.status,
      template.body_text,
    ]);
  }, [templates, statusFilter, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-yellow-600" /> Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" /> Rejected
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200">
            Paused
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 hover:bg-slate-200">
            Draft
          </Badge>
        );
    }
  };

  const getSyncedLabel = () => {
    if (!lastSynced) return '';
    const mins = Math.round((new Date().getTime() - lastSynced.getTime()) / 60000);
    return mins === 0 ? 'Last synced just now' : `Last synced ${mins} min ago`;
  };

  if (activeView === 'create') {
    return (
      <TemplateBuilder
        initialData={selectedTemplate}
        onBack={() => {
          setSelectedTemplate(null);
          setActiveView('list');
          refetch();
        }}
      />
    );
  }

  if (activeView === 'library') {
    return (
      <TemplateLibrary
        onUseTemplate={(libTemplate) => {
          const t: Partial<WhatsAppTemplate> = {
            template_name: libTemplate.name,
            category: libTemplate.category,
            language: 'en',
            header_type: libTemplate.header_type,
            header_text: null,
            body_text: libTemplate.body_text,
            variables: libTemplate.variables,
            footer_text: libTemplate.footer_text,
            buttons: [],
            company_id: company.id,
            industry: libTemplate.industry,
            status: 'draft'
          };
          setSelectedTemplate(t as WhatsAppTemplate);
          setActiveView('create');
        }}
        onBack={() => setActiveView('list')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Total Templates</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{totalCount}</h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Approved</p>
              <h3 className="text-2xl font-bold mt-1 text-green-600">{approvedCount}</h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Pending Approval</p>
              <h3 className="text-2xl font-bold mt-1 text-yellow-600">{pendingCount}</h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Rejected</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{rejectedCount}</h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setSelectedTemplate(null); setActiveView('create'); }} className="gradient-primary border-0 text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Create Template
          </Button>
          <Button variant="outline" onClick={() => setActiveView('library')} className="text-xs">
            <BookOpen className="w-4 h-4 mr-1.5" /> Browse Library
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {lastSynced && (
            <span className="text-xs text-muted-foreground italic">
              {getSyncedLabel()}
            </span>
          )}
          <Button
            variant="ghost"
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync from Meta
          </Button>
        </div>
      </div>

      {/* Main List Table Card */}
      <Card className="bg-card shadow-sm">
        <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter}>
          <div className="px-6 pt-4 border-b border-border flex justify-between items-center">
            <TabsList className="bg-transparent space-x-1 p-0 h-auto">
              <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-4 text-xs font-semibold">
                All
              </TabsTrigger>
              <TabsTrigger value="approved" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-4 text-xs font-semibold">
                Approved
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-4 text-xs font-semibold">
                Pending
              </TabsTrigger>
              <TabsTrigger value="rejected" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-4 text-xs font-semibold">
                Rejected
              </TabsTrigger>
              <TabsTrigger value="draft" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-4 text-xs font-semibold">
                Drafts
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">
            {templatesLoading ? (
              <div className="flex justify-center items-center py-20">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[10%] text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">
                        <div className="space-y-1">
                          <span className="block truncate max-w-[250px]">{template.template_name}</span>
                          {template.rejection_reason && (
                            <span className="text-[10px] text-destructive block bg-red-50/50 p-1.5 rounded border border-red-100 max-w-md">
                              Rejection: {template.rejection_reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(template.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(template.updated_at), 'MMM dd, yyyy h:mm a')}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Action configurations per status */}
                            {template.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => { setSelectedTemplate(template); setActiveView('create'); }}>
                                  <Edit2 className="w-4 h-4 mr-2" /> Edit Draft
                                </DropdownMenuItem>
                                {isAdminOrManager && (
                                  <DropdownMenuItem onClick={() => handleSubmit(template.id)}>
                                    <Send className="w-4 h-4 mr-2" /> Submit to Meta
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {template.status === 'rejected' && (
                              <DropdownMenuItem onClick={() => { setSelectedTemplate(template); setActiveView('create'); }}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit & Resubmit
                              </DropdownMenuItem>
                            )}

                            {['pending', 'approved', 'rejected'].includes(template.status) && (
                              <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                            )}

                            {template.status === 'approved' && (
                              <DropdownMenuItem onClick={() => handleClone(template)}>
                                <Copy className="w-4 h-4 mr-2" /> Clone Template
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleDelete(template.id, template.template_name)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-20 text-muted-foreground bg-card flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-8 h-8 opacity-20" />
                <p className="text-sm">No templates match the selected status.</p>
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>

      {/* Details View Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate font-bold">{previewTemplate?.template_name.replace(/_/g, ' ')}</DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">{previewTemplate?.template_name}</DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold block text-muted-foreground">Category</span>
                  <span className="font-medium text-foreground">{previewTemplate.category}</span>
                </div>
                <div>
                  <span className="font-semibold block text-muted-foreground">Language</span>
                  <span className="font-medium text-foreground uppercase">{previewTemplate.language}</span>
                </div>
                <div>
                  <span className="font-semibold block text-muted-foreground">Header Type</span>
                  <span className="font-medium text-foreground capitalize">{previewTemplate.header_type}</span>
                </div>
                <div>
                  <span className="font-semibold block text-muted-foreground">Status</span>
                  <span>{getStatusBadge(previewTemplate.status)}</span>
                </div>
              </div>

              {/* Message preview block */}
              <div className="bg-[#E5DDD5] p-4 rounded-xl border border-border bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat min-h-[160px] flex flex-col justify-end">
                <div className="bg-white rounded-lg shadow-sm max-w-[90%] ml-auto p-2.5 space-y-1">
                  {previewTemplate.header_text && (
                    <h4 className="font-bold text-sm text-foreground">{previewTemplate.header_text}</h4>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewTemplate.body_text}</p>
                  {previewTemplate.footer_text && (
                    <p className="text-[10px] text-muted-foreground pt-1">{previewTemplate.footer_text}</p>
                  )}
                </div>
                {previewTemplate.buttons && previewTemplate.buttons.length > 0 && (
                  <div className="max-w-[90%] ml-auto space-y-1 mt-1">
                    {previewTemplate.buttons.map((btn, i) => (
                      <div key={i} className="bg-white border text-center text-xs py-2 rounded-lg text-blue-500 font-semibold shadow-sm">
                        {btn.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
