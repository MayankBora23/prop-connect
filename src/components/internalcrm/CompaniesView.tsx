import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useIsInternalCRM } from '@/hooks/useIndustry';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { format, addDays } from 'date-fns';
import { Building2, Mail, Phone, MapPin, Edit, Trash2, Loader2, Settings as SettingsIcon, ShieldCheck, ShieldAlert, Clock, Timer, History, CreditCard, AlertTriangle } from 'lucide-react';
import { useAllCompanies, useUpdateCompany, useDeleteCompany, useUpdateCompanySettings, useCompanyTeamCount, type Company } from '@/hooks/useCompany';
import { CompanyBillingHistoryDialog } from './CompanyBillingHistoryDialog';
import { Wallet } from 'lucide-react';
import { CompanyWalletHistoryDialog } from './CompanyWalletHistoryDialog';
import {
    useExtendTrial,
    useAllCompanySubscriptions,
    computeExtendedTrialEnd,
    computeSubscriptionFields,
    type AllCompanySubscriptionRow,
} from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';

const editCompanySchema = z.object({
    name: z.string().min(1, 'Company name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    pan_number: z.string().optional().or(z.literal('')),
    gst_number: z.string().optional().or(z.literal('')),
});

type EditCompanyFormData = z.infer<typeof editCompanySchema>;

const settingsSchema = z.object({
    allow_login: z.boolean(),
    account_status: z.enum(['active', 'suspended']),
    user_limit: z.number().int().min(1, 'User limit must be at least 1'),
    status_notes: z.string().optional().or(z.literal('')),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

function formatInr(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
}

function titleCase(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function CompanyPlanBillingCell({ sub }: { sub: AllCompanySubscriptionRow | undefined }) {
    if (!sub) {
        return (
            <div className="flex flex-col gap-1">
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 w-fit">
                    No subscription
                </Badge>
            </div>
        );
    }

    const computed = computeSubscriptionFields(sub);
    const planName = computed.plan_name ?? titleCase(computed.plan_slug);
    const cycleLabel = computed.billingCycle ? titleCase(computed.billingCycle) : null;

    if (computed.isPaymentOverdue) {
        const daysOverdue = Math.abs(computed.daysUntilBilling ?? 0);
        return (
            <div className="flex flex-col gap-1.5">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 w-fit">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Payment Overdue
                </Badge>
                <span className="text-xs font-medium text-foreground">
                    {planName}
                    {cycleLabel && <span className="text-muted-foreground"> · {cycleLabel}</span>}
                </span>
                {computed.nextBillingDate && (
                    <span className="text-xs text-orange-700">
                        Due {format(computed.nextBillingDate, 'dd MMM yyyy')}
                        {daysOverdue > 0 && ` (${daysOverdue}d overdue)`}
                    </span>
                )}
                {computed.nextBillingAmount != null && computed.nextBillingAmount > 0 && (
                    <span className="text-xs text-muted-foreground">
                        Amount due: {formatInr(computed.nextBillingAmount)}
                    </span>
                )}
            </div>
        );
    }

    if (computed.isActive) {
        return (
            <div className="flex flex-col gap-1.5">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 w-fit">
                    <CreditCard className="w-3 h-3 mr-1" />
                    Paid — {planName}
                </Badge>
                {cycleLabel && (
                    <span className="text-xs text-muted-foreground">{cycleLabel} billing</span>
                )}
                {computed.nextBillingDate && (
                    <span className="text-xs text-muted-foreground">
                        Next: {format(computed.nextBillingDate, 'dd MMM yyyy')}
                        {computed.nextBillingAmount != null && computed.nextBillingAmount > 0 && (
                            <> · {formatInr(computed.nextBillingAmount)}</>
                        )}
                    </span>
                )}
                {computed.purchasedExtraSeats > 0 && (
                    <span className="text-xs text-muted-foreground">
                        +{computed.purchasedExtraSeats} extra seat(s)
                    </span>
                )}
            </div>
        );
    }

    if (computed.isTrialActive) {
        return (
            <div className="flex flex-col gap-1.5">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 w-fit">
                    <Clock className="w-3 h-3 mr-1" />
                    Trial — {computed.daysLeftInTrial}d left
                </Badge>
                <span className="text-xs text-muted-foreground">
                    Ends {format(new Date(computed.trial_ends_at), 'dd MMM yyyy')}
                </span>
                <span className="text-xs text-muted-foreground">No plan purchased yet</span>
            </div>
        );
    }

    if (computed.status === 'cancelled') {
        return (
            <div className="flex flex-col gap-1.5">
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 w-fit">
                    Cancelled
                </Badge>
                <span className="text-xs text-muted-foreground">
                    Was on {planName}
                    {cycleLabel && <> ({cycleLabel})</>}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 w-fit">
                {computed.isTrialExpired ? 'Trial Expired' : 'Expired'}
            </Badge>
            <span className="text-xs text-muted-foreground">No active plan</span>
            {computed.isTrialExpired && (
                <span className="text-xs text-muted-foreground">
                    Ended {format(new Date(computed.trial_ends_at), 'dd MMM yyyy')}
                </span>
            )}
        </div>
    );
}

export const CompaniesView = () => {
    const { data: companies, isLoading } = useAllCompanies();
    const { data: allSubscriptions = [] } = useAllCompanySubscriptions();
    const updateCompany = useUpdateCompany();
    const deleteCompany = useDeleteCompany();
    const extendTrialMutation = useExtendTrial();
    const isInternalCRM = useIsInternalCRM();

    const subscriptionByCompany = useMemo(() => {
        const map = new Map<string, AllCompanySubscriptionRow>();
        for (const s of allSubscriptions) {
            map.set(s.company_id, s);
        }
        return map;
    }, [allSubscriptions]);

    const { search } = useSectionSearch();
    const filteredCompanies = useMemo(
        () =>
            filterBySearch(companies, search, (company) => [
                company.name,
                company.email,
                company.phone,
                company.industry,
                company.address,
            ]),
        [companies, search]
    );

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [extendTrialOpen, setExtendTrialOpen] = useState(false);
    const [subscriptionCompany, setSubscriptionCompany] = useState<Company | null>(null);
    const [extendDays, setExtendDays] = useState(7);
    const [extendNotes, setExtendNotes] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [billingHistoryOpen, setBillingHistoryOpen] = useState(false);
    const [billingHistoryCompany, setBillingHistoryCompany] = useState<Company | null>(null);
    const [walletHistoryOpen, setWalletHistoryOpen] = useState(false);
    const [walletHistoryCompany, setWalletHistoryCompany] = useState<Company | null>(null);

    const form = useForm<EditCompanyFormData>({
        resolver: zodResolver(editCompanySchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            address: '',
            pan_number: '',
            gst_number: '',
        },
    });

    const getIndustryBadge = (industry: string | null) => {
        switch (industry) {
            case 'real_estate':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Real Estate</Badge>;
            case 'education':
                return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Education</Badge>;
            case 'automobile_dealers':
                return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Automobile</Badge>;
            case 'internal_crm':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Internal CRM</Badge>;
            default:
                return <Badge variant="secondary">{industry}</Badge>;
        }
    };

    const handleEditClick = (company: Company) => {
        setSelectedCompany(company);
        form.reset({
            name: company.name || '',
            email: company.email || '',
            phone: company.phone || '',
            address: company.address || '',
            pan_number: company.pan_number || '',
            gst_number: company.gst_number || '',
        });
        setEditDialogOpen(true);
    };

    const handleSettingsClick = (company: Company) => {
        setSelectedCompany(company);
        setSettingsDialogOpen(true);
    };

    const handleDeleteClick = (company: Company) => {
        setSelectedCompany(company);
        setDeleteDialogOpen(true);
    };

    const openExtendTrialDialog = (company: Company) => {
        setSubscriptionCompany(company);
        setExtendDays(7);
        setExtendNotes(subscriptionByCompany.get(company.id)?.trial_extend_notes ?? '');
        setExtendTrialOpen(true);
    };

    const handleBillingHistoryClick = (company: Company) => {
        setBillingHistoryCompany(company);
        setBillingHistoryOpen(true);
    };

    const handleWalletHistoryClick = (company: Company) => {
        setWalletHistoryCompany(company);
        setWalletHistoryOpen(true);
    };

    const onSubmitEdit = async (data: EditCompanyFormData) => {
        if (!selectedCompany) return;

        try {
            await updateCompany.mutateAsync({
                id: selectedCompany.id,
                name: data.name,
                email: data.email,
                phone: data.phone || null,
                address: data.address || null,
                pan_number: data.pan_number || null,
                gst_number: data.gst_number || null,
            });
            toast.success('Company updated successfully');
            setEditDialogOpen(false);
            setSelectedCompany(null);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update company');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedCompany) return;

        try {
            await deleteCompany.mutateAsync(selectedCompany.id);
            toast.success('Company deleted successfully');
            setDeleteDialogOpen(false);
            setSelectedCompany(null);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete company');
        }
    };

    if (isLoading) {
        return (
            <div className="card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan & Billing</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered On</th>
                                {isInternalCRM && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-12 w-36" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                                    {isInternalCRM && <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan & Billing</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered On</th>
                                {isInternalCRM && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredCompanies && filteredCompanies.length === 0 ? (
                                <tr>
                                    <td colSpan={isInternalCRM ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                                        No companies found.
                                    </td>
                                </tr>
                            ) : (
                                filteredCompanies?.map((company) => (
                                    <tr key={company.id} className="hover:bg-secondary/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-white shrink-0">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-foreground font-semibold uppercase tracking-tight">
                                                        {company.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        ID: {company.id.slice(0, 8)}...
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {company.email || 'No email provided'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {company.phone || 'No phone'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getIndustryBadge(company.industry)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {company.industry !== 'internal_crm' ? (
                                                <CompanyPlanBillingCell sub={subscriptionByCompany.get(company.id)} />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {company.address || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {format(new Date(company.created_at), 'MMM dd, yyyy')}
                                        </td>
                                        {isInternalCRM && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditClick(company)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSettingsClick(company)}
                                                        className="h-8 w-8 p-0"
                                                        title="Settings"
                                                    >
                                                        <SettingsIcon className="h-4 w-4" />
                                                    </Button>
                                                    {company.industry !== 'internal_crm' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-orange-600 border-orange-200 hover:bg-orange-50 h-8 w-8 p-0"
                                                            onClick={() => openExtendTrialDialog(company)}
                                                            title="Extend trial period"
                                                        >
                                                            <Timer className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {company.industry !== 'internal_crm' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleBillingHistoryClick(company)}
                                                            title="Billing History"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {company.industry !== 'internal_crm' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleWalletHistoryClick(company)}
                                                            title="Wallet Top-up History"
                                                        >
                                                            <Wallet className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(company)}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Company</DialogTitle>
                        <DialogDescription>
                            Update company information. Changes will be saved immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="pan_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>PAN Number</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., ABCDE1234F" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="gst_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GST Number</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., 29ABCDE1234F1Z5" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setEditDialogOpen(false);
                                        setSelectedCompany(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateCompany.isPending}>
                                    {updateCompany.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the company
                            "{selectedCompany?.name}" and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteCompany.isPending}
                        >
                            {deleteCompany.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Settings Dialog */}
            {selectedCompany && (
                <CompanySettingsDialog
                    key={selectedCompany.id}
                    company={selectedCompany}
                    open={settingsDialogOpen}
                    onOpenChange={setSettingsDialogOpen}
                />
            )}

            <Dialog open={extendTrialOpen} onOpenChange={setExtendTrialOpen}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Extend Trial — {subscriptionCompany?.name}</DialogTitle>
                        <DialogDescription>
                            Current trial end:{' '}
                            {subscriptionCompany &&
                                subscriptionByCompany.get(subscriptionCompany.id)?.trial_ends_at
                                ? format(
                                    new Date(
                                        subscriptionByCompany.get(subscriptionCompany.id)!
                                            .trial_ends_at
                                    ),
                                    'dd MMM yyyy'
                                )
                                : '—'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Extend by (days)</Label>
                            <Input
                                type="number"
                                min={1}
                                max={365}
                                value={extendDays}
                                onChange={(e) => setExtendDays(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">
                                New trial end will be:{' '}
                                {subscriptionCompany &&
                                    subscriptionByCompany.get(subscriptionCompany.id)?.trial_ends_at
                                    ? format(
                                        computeExtendedTrialEnd(
                                            subscriptionByCompany.get(subscriptionCompany.id)!
                                                .trial_ends_at,
                                            extendDays
                                        ),
                                        'dd MMM yyyy'
                                    )
                                    : subscriptionCompany
                                        ? format(addDays(new Date(), extendDays), 'dd MMM yyyy')
                                        : '—'}
                            </p>
                            {subscriptionCompany &&
                                subscriptionByCompany.get(subscriptionCompany.id)?.trial_ends_at &&
                                new Date(
                                    subscriptionByCompany.get(subscriptionCompany.id)!.trial_ends_at
                                ) <= new Date() && (
                                    <p className="text-xs text-amber-700">
                                        Trial already expired — extension starts from today, not the old end date.
                                    </p>
                                )}
                        </div>
                        <div className="space-y-2">
                            <Label>Reason / Notes</Label>
                            <Textarea
                                placeholder="e.g. Client requested more time to evaluate"
                                value={extendNotes}
                                onChange={(e) => setExtendNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExtendTrialOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="gradient-primary border-0"
                            disabled={extendTrialMutation.isPending || !subscriptionCompany}
                            onClick={() => {
                                if (!subscriptionCompany) return;
                                extendTrialMutation.mutate(
                                    {
                                        company_id: subscriptionCompany.id,
                                        extra_days: extendDays,
                                        notes: extendNotes,
                                    },
                                    {
                                        onSuccess: (result) => {
                                            toast.success(
                                                `Trial extended by ${extendDays} days (ends ${format(
                                                    new Date(result.trial_ends_at),
                                                    'dd MMM yyyy'
                                                )})${extendNotes.trim() ? ' — notes saved' : ''}`
                                            );
                                            setExtendTrialOpen(false);
                                            setExtendNotes('');
                                        },
                                        onError: (err) =>
                                            toast.error(
                                                err instanceof Error
                                                    ? err.message
                                                    : 'Failed to extend trial'
                                            ),
                                    }
                                );
                            }}
                        >
                            {extendTrialMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                `Extend by ${extendDays} days`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <CompanyBillingHistoryDialog
                company={billingHistoryCompany}
                open={billingHistoryOpen}
                onOpenChange={setBillingHistoryOpen}
            />
            <CompanyWalletHistoryDialog
                company={walletHistoryCompany}
                open={walletHistoryOpen}
                onOpenChange={setWalletHistoryOpen}
            />
        </>
    );
};

const CompanySettingsDialog = ({
    company,
    open,
    onOpenChange
}: {
    company: Company;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    const updateSettings = useUpdateCompanySettings();
    const { data: teamCount } = useCompanyTeamCount(company.id);

    const form = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            allow_login: company.allow_login ?? true,
            account_status: company.account_status ?? 'active',
            user_limit: company.user_limit ?? 5,
            status_notes: company.status_notes ?? '',
        },
    });

    // Reactive logic for status changes
    const watchStatus = form.watch('account_status');

    useEffect(() => {
        if (watchStatus === 'suspended') {
            form.setValue('allow_login', false);
        } else if (watchStatus === 'active') {
            form.setValue('allow_login', true);
        }
    }, [watchStatus, form]);

    const onSubmit = async (data: SettingsFormData) => {
        try {
            await updateSettings.mutateAsync({
                id: company.id,
                allow_login: data.allow_login,
                account_status: data.account_status,
                user_limit: data.user_limit,
                status_notes: data.status_notes || null,
            });
            toast.success('Company settings updated');
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update settings');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500 hover:bg-green-600"><ShieldCheck className="w-3 h-3 mr-1" /> Active</Badge>;
            case 'suspended':
                return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600"><ShieldAlert className="w-3 h-3 mr-1" /> Suspended</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between pr-6">
                        <span>Manage Company: {company.name}</span>
                        {getStatusBadge(watchStatus)}
                    </DialogTitle>
                    <DialogDescription>
                        Company ID: <code className="bg-muted px-1 rounded text-xs">{company.id}</code>
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/40 p-5 rounded-xl border border-border/60 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                License Usage
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-bold text-foreground">
                                    {teamCount ?? 0}
                                </span>
                                <span className="text-muted-foreground font-semibold text-sm">
                                    / {form.watch('user_limit')} Seats
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border ${(teamCount ?? 0) > form.watch('user_limit')
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : 'bg-green-500/10 text-green-600 border-green-500/20'
                                }`}>
                                {(teamCount ?? 0) > form.watch('user_limit') ? 'Usage Over Limit' : 'Within License Limit'}
                            </span>
                        </div>
                    </div>
                    <div className="relative h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-700 ease-in-out ${(teamCount ?? 0) > form.watch('user_limit') ? 'bg-destructive' : 'gradient-primary'
                                }`}
                            style={{ width: `${Math.min(100, ((teamCount ?? 0) / (form.watch('user_limit') || 1)) * 100)}%` }}
                        />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground bg-background/50 p-2 rounded-md border border-border/40">
                        <Building2 className="w-3 h-3 text-primary" />
                        <span>This company is currently utilizing <strong>{teamCount ?? 0}</strong> active seat(s) out of their <strong>{form.watch('user_limit')}</strong> seat allocation.</span>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="account_status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="suspended">Suspended</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="allow_login"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-end pb-2">
                                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Allow Login</FormLabel>
                                                <p className="text-xs text-muted-foreground">
                                                    Control portal access
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="user_limit"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Maximum Seat Limit</FormLabel>
                                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            Column: user_limit
                                        </span>
                                    </div>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                className="pl-9"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                            />
                                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        </div>
                                    </FormControl>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Defines the total number of users allowed for this company.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status_notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status Reason / Internal Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Reason for suspension..."
                                            className="resize-none"
                                            {...field}
                                            required={watchStatus === 'suspended'}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateSettings.isPending} className="gradient-primary">
                                {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Settings
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
