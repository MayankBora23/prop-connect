import { useState, useMemo } from 'react';
import { useInternalDemos, useUpdateInternalDemo, useDeleteInternalDemo, InternalDemo } from '@/hooks/useInternalDemos';
import { useInternalLeads, InternalLead } from '@/hooks/useInternalLeads';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    User,
    Edit,
    Trash2,
    Clock,
    Check,
    X,
    Building2,
    Video
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { ScheduleDemoDialog } from './ScheduleDemoDialog';
import { EditDemoDialog } from './EditDemoDialog';
import { toast } from 'sonner';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';

export function InternalDemosView() {
    const { data: demos, isLoading: demosLoading } = useInternalDemos();
    const { data: leads, isLoading: leadsLoading } = useInternalLeads();
    const deleteDemo = useDeleteInternalDemo();
    const updateDemo = useUpdateInternalDemo();

    const [scheduleDemoOpen, setScheduleDemoOpen] = useState(false);
    const [selectedLeadForScheduling, setSelectedLeadForScheduling] = useState<InternalLead | null>(null);
    const [editDemoOpen, setEditDemoOpen] = useState(false);
    const [selectedDemoForEdit, setSelectedDemoForEdit] = useState<InternalDemo | null>(null);
    const { search } = useSectionSearch();

    const isLoading = demosLoading || leadsLoading;

    const pendingLeads = useMemo(
        () =>
            filterBySearch(
                leads?.filter((lead) => lead.stage === 'demo_scheduled') || [],
                search,
                (lead) => [lead.company_name, lead.lead_name, lead.phone_no, lead.industry]
            ),
        [leads, search]
    );

    const filteredDemos = useMemo(
        () =>
            filterBySearch(demos, search, (demo) => [
                demo.internal_leads?.company_name,
                demo.internal_leads?.lead_name,
                demo.internal_leads?.phone_no,
                demo.status,
                demo.notes,
                demo.meeting_link,
            ]),
        [demos, search]
    );

    const getDemoStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleStatusUpdate = async (demoId: string, newStatus: string, leadName: string) => {
        try {
            await updateDemo.mutateAsync({
                id: demoId,
                status: newStatus as any,
            });

            toast.success(`Demo marked as ${newStatus.replace('_', ' ')}`, {
                description: `CRM Demo for ${leadName} has been updated.`,
            });
        } catch (error: any) {
            console.error('Status update error:', error);
            toast.error('Failed to update demo status');
        }
    };

    const handleDelete = async (demoId: string, leadName: string) => {
        try {
            await deleteDemo.mutateAsync(demoId);
            toast.success(`Demo record for ${leadName} has been deleted.`);
        } catch (error) {
            toast.error('Failed to delete demo record.');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    const DemoTable = ({ items, title, dotColor }: { items: InternalDemo[]; title: string; dotColor: string }) => (
        <div className="card-elevated overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-border bg-card/50">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    {title} ({items.length})
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-secondary/30">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead / Company</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {items.length > 0 ? (
                            items.map((demo) => (
                                <tr key={demo.id} className="hover:bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                                                {demo.internal_leads?.lead_name?.[0] || 'L'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground text-sm">{demo.internal_leads?.lead_name || 'Unknown Lead'}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" />
                                                    {demo.internal_leads?.company_name || 'No Company'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="text-[10px] uppercase">
                                            {demo.internal_leads?.industry?.replace('_', ' ') || 'General'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm">
                                            <p className="font-medium">{demo.demo_date}</p>
                                            <p className="text-xs text-muted-foreground">{demo.demo_time}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge className={getDemoStatusColor(demo.status)}>{demo.status}</Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                    setSelectedDemoForEdit(demo);
                                                    setEditDemoOpen(true);
                                                }}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>

                                            <div className="flex items-center gap-1">
                                                {demo.status === 'scheduled' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 px-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                                                            onClick={() => handleStatusUpdate(demo.id, 'completed', demo.internal_leads?.lead_name || 'Lead')}
                                                        >
                                                            <Check className="w-3.5 h-3.5 mr-1" />
                                                            Done
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 px-2 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200"
                                                            onClick={() => handleStatusUpdate(demo.id, 'cancelled', demo.internal_leads?.lead_name || 'Lead')}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Demo Record</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete this demo record? This will not affect the lead itself.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(demo.id, demo.internal_leads?.lead_name || 'Lead')}
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
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                                    No {title.toLowerCase()} found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in p-1">

            {/* Pending Scheduled Leads - List View */}
            {pendingLeads.length > 0 && (
                <div className="card-elevated overflow-hidden border-l-4 border-l-orange-500">
                    <div className="px-4 py-3 border-b border-border bg-orange-50/50">
                        <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Leads Awaiting Demo Scheduling ({pendingLeads.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-orange-50/30">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-orange-800 uppercase tracking-wider">Lead / Company</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-orange-800 uppercase tracking-wider">Industry</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-orange-800 uppercase tracking-wider">Phone</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-orange-800 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100">
                                {pendingLeads.map(lead => {
                                    const hasDemoRecord = (demos || []).some(d => d.lead_id === lead.id && d.status === 'scheduled');
                                    if (hasDemoRecord) return null;

                                    return (
                                        <tr key={lead.id} className="hover:bg-orange-50/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-sm text-foreground">{lead.lead_name}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {lead.company_name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-[10px] uppercase border-orange-200 text-orange-700 bg-orange-50">
                                                    {lead.industry}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {lead.phone_no || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    size="sm"
                                                    className="bg-orange-600 hover:bg-orange-700 text-white border-0 h-8 font-medium"
                                                    onClick={() => {
                                                        setSelectedLeadForScheduling(lead);
                                                        setScheduleDemoOpen(true);
                                                    }}
                                                >
                                                    <Video className="w-4 h-4 mr-2" />
                                                    Book Demo
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tables by status */}
            <DemoTable
                items={filteredDemos.filter(d => d.status === 'scheduled')}
                title="Scheduled Demos"
                dotColor="bg-blue-500"
            />

            <DemoTable
                items={filteredDemos.filter(d => d.status === 'completed')}
                title="Completed Demos"
                dotColor="bg-green-500"
            />

            {filteredDemos.filter(d => d.status === 'cancelled').length > 0 && (
                <DemoTable
                    items={filteredDemos.filter(d => d.status === 'cancelled')}
                    title="Cancelled Demos"
                    dotColor="bg-gray-500"
                />
            )}

            {/* Dialogs */}
            <ScheduleDemoDialog
                lead={selectedLeadForScheduling}
                open={scheduleDemoOpen}
                onOpenChange={(open) => {
                    setScheduleDemoOpen(open);
                    if (!open) setSelectedLeadForScheduling(null);
                }}
            />

            <EditDemoDialog
                demo={selectedDemoForEdit}
                open={editDemoOpen}
                onOpenChange={(open) => {
                    setEditDemoOpen(open);
                    if (!open) setSelectedDemoForEdit(null);
                }}
            />
        </div>
    );
}
