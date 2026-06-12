import { useState, useEffect } from 'react';
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
import { format } from 'date-fns';
import { Building2, Mail, Phone, MapPin, Edit, Trash2, Loader2, Settings as SettingsIcon, ShieldCheck, ShieldAlert, ShieldX, Clock, Sparkles, History, CreditCard, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { useAllCompanies, useUpdateCompany, useDeleteCompany, useUpdateCompanySettings, useCompanyTeamCount, type Company } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    plan_type: z.enum(['trial', 'premium', 'bypass']),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export const CompaniesView = () => {
    const { data: companies, isLoading } = useAllCompanies();
    const updateCompany = useUpdateCompany();
    const deleteCompany = useDeleteCompany();
    const isInternalCRM = useIsInternalCRM();

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [paymentHistoryDialogOpen, setPaymentHistoryDialogOpen] = useState(false);
    const [paymentHistoryCompany, setPaymentHistoryCompany] = useState<Company | null>(null);

    const handlePaymentHistoryClick = (company: Company) => {
        setPaymentHistoryCompany(company);
        setPaymentHistoryDialogOpen(true);
    };

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
                <table className="w-full">
                    <thead className="bg-secondary">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>
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
                                <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                                {isInternalCRM && <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <>
            <div className="card-elevated overflow-hidden">
                <table className="w-full">
                    <thead className="bg-secondary">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered On</th>
                            {isInternalCRM && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {companies && companies.length === 0 ? (
                            <tr>
                                <td colSpan={isInternalCRM ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                                    No companies found.
                                </td>
                            </tr>
                        ) : (
                            companies?.map((company) => (
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
                                    <td className="px-4 py-3">{getIndustryBadge(company.industry)}</td>
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handlePaymentHistoryClick(company)}
                                                    className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                                    title="Payment History"
                                                >
                                                    <CreditCard className="h-4 w-4" />
                                                </Button>
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

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl">
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

            {/* Payment History Dialog */}
            {paymentHistoryCompany && (
                <CompanyPaymentHistoryDialog
                    company={paymentHistoryCompany}
                    open={paymentHistoryDialogOpen}
                    onOpenChange={setPaymentHistoryDialogOpen}
                />
            )}
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

    const initialPlanType = 
        company.plan_type === 'premium' || company.status_notes === 'premium' 
            ? 'premium' 
            : company.plan_type === 'bypass' || company.status_notes === 'bypass'
                ? 'bypass'
                : 'trial';

    const form = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            allow_login: company.allow_login ?? true,
            account_status: company.account_status ?? 'active',
            user_limit: company.user_limit ?? 5,
            status_notes: company.status_notes ?? '',
            plan_type: initialPlanType,
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
                plan_type: data.plan_type,
            });

            // Log administrative plan change in wallet_transactions
            if (data.plan_type !== initialPlanType) {
                try {
                    let amount = 0;
                    let notes = '';
                    if (data.plan_type === 'premium') {
                        amount = 4100;
                        notes = 'Upgraded to Pro CRM Enterprise by Administrator';
                    } else if (data.plan_type === 'bypass') {
                        amount = 0;
                        notes = 'Trial Bypass Unlocked by Administrator';
                    } else {
                        amount = 0;
                        notes = 'Downgraded to Free Trial by Administrator';
                    }

                    await supabase
                        .from('wallet_transactions')
                        .insert({
                            company_id: company.id,
                            type: 'plan',
                            provider: 'admin',
                            service_type: 'subscription',
                            amount_inr: amount,
                            notes: notes,
                            status: 'completed',
                        } as any);
                } catch (txErr) {
                    console.error('Failed to log plan settings change transaction:', txErr);
                }
            }

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
            <DialogContent className="max-w-xl">
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
                            name="plan_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plan / Subscription Level</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select plan type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="trial">
                                                <span className="flex items-center gap-1.5 font-medium text-orange-600 dark:text-orange-400">
                                                    <Clock className="w-3.5 h-3.5" /> 14-Day Free Trial
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="premium">
                                                <span className="flex items-center gap-1.5 font-bold text-primary">
                                                    <Sparkles className="w-3.5 h-3.5 fill-current text-primary" /> Pro CRM Enterprise (Active / Unlocked)
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="bypass">
                                                <span className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Continue Without Upgrading (Trial Bypass)
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Switching this to **Pro CRM Enterprise** or **Continue Without Upgrading** allows this company to continue using the CRM indefinitely without requiring upgrade payments.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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

const CompanyPaymentHistoryDialog = ({
    company,
    open,
    onOpenChange
}: {
    company: Company;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    // 1. Fetch wallet_transactions
    const { data: transactions = [], isLoading: txLoading } = useQuery({
        queryKey: ['admin_wallet_transactions', company.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: open && !!company.id
    });

    // 2. Fetch payment_orders
    const { data: paymentOrders = [], isLoading: ordersLoading } = useQuery({
        queryKey: ['admin_payment_orders', company.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('payment_orders')
                .select('*')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: open && !!company.id
    });

    // 3. Fetch wallet balance
    const { data: wallet } = useQuery({
        queryKey: ['admin_company_wallet', company.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('company_id', company.id)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: open && !!company.id
    });

    // Calculate Summary Stats
    const currentBalance = wallet?.balance ? Number(wallet.balance) : 0;
    
    // Total Recharged: sum of completed credits or paid payment orders
    const totalRecharged = useMemo(() => {
        return transactions
            .filter((t) => t.type === 'credit' && t.status === 'completed')
            .reduce((sum, t) => sum + Number(t.amount_inr || 0), 0);
    }, [transactions]);

    // Total Plan Subscription Charges
    const totalPlanCharges = useMemo(() => {
        return transactions
            .filter((t) => (t.type === 'plan' || t.type === 'subscription') && t.status === 'completed')
            .reduce((sum, t) => sum + Number(t.amount_inr || 0), 0);
    }, [transactions]);

    // Total usage debits
    const totalUsageDebits = useMemo(() => {
        return transactions
            .filter((t) => t.type === 'debit')
            .reduce((sum, t) => sum + Number(t.amount_inr || 0), 0);
    }, [transactions]);

    // CSV Export
    const exportTransactionsCsv = () => {
        const header = ['Date', 'Type', 'Amount (INR)', 'Provider/Method', 'Service', 'Notes', 'Status'];
        const lines = transactions.map((t) => [
            t.created_at ? format(new Date(t.created_at), 'yyyy-MM-dd HH:mm') : '',
            t.type ?? '',
            t.amount_inr ?? 0,
            t.provider ?? '',
            t.service_type ?? '',
            (t.notes ?? '').replace(/,/g, ' '),
            t.status ?? 'completed'
        ].join(','));
        const csv = [header.join(','), ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${company.name.replace(/\s+/g, '_')}_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getTransactionTypeBadge = (type: string) => {
        switch (type) {
            case 'credit':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Recharge</Badge>;
            case 'plan':
            case 'subscription':
                return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white">Plan Upgrade</Badge>;
            case 'debit':
                return <Badge variant="secondary">Usage Debit</Badge>;
            default:
                return <Badge variant="outline" className="capitalize">{type}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between pr-6 border-b pb-4">
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <CreditCard className="w-6 h-6 text-primary" />
                            <span>Payment History: {company.name}</span>
                        </DialogTitle>
                        <DialogDescription>
                            Audit ledger transactions, subscription plans, and API recharges for this company.
                        </DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportTransactionsCsv} disabled={transactions.length === 0}>
                        Export Ledger (CSV)
                    </Button>
                </DialogHeader>

                {/* Summary Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="gradient-primary p-4 rounded-xl text-white shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Wallet Balance</span>
                            <Wallet className="w-5 h-5 text-white/90" />
                        </div>
                        <span className="text-2xl font-extrabold mt-3">₹{currentBalance.toFixed(2)}</span>
                    </div>

                    <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Recharges</span>
                            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-2xl font-extrabold mt-3 text-emerald-600">₹{totalRecharged.toFixed(2)}</span>
                    </div>

                    <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription Spent</span>
                            <DollarSign className="w-5 h-5 text-indigo-500" />
                        </div>
                        <span className="text-2xl font-extrabold mt-3 text-indigo-600">₹{totalPlanCharges.toFixed(2)}</span>
                    </div>

                    <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usage Charges</span>
                            <ArrowDownRight className="w-5 h-5 text-orange-500" />
                        </div>
                        <span className="text-2xl font-extrabold mt-3 text-orange-600">₹{totalUsageDebits.toFixed(2)}</span>
                    </div>
                </div>

                <div className="mt-8">
                    <Tabs defaultValue="transactions" className="w-full">
                        <TabsList className="grid grid-cols-2 mb-6">
                            <TabsTrigger value="transactions" className="font-semibold">Ledger & Usage Transactions</TabsTrigger>
                            <TabsTrigger value="orders" className="font-semibold">Razorpay Recharge Orders</TabsTrigger>
                        </TabsList>

                        <TabsContent value="transactions" className="space-y-4">
                            <div className="rounded-md border max-h-[40vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-secondary sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Provider</TableHead>
                                            <TableHead>Service</TableHead>
                                            <TableHead>Notes</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {txLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                                    Loading transaction ledger...
                                                </TableCell>
                                            </TableRow>
                                        ) : transactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No transactions recorded for this company.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transactions.map((tx) => {
                                                const isCredit = tx.type === 'credit';
                                                const isPlan = tx.type === 'plan' || tx.type === 'subscription';
                                                return (
                                                    <TableRow key={tx.id} className="hover:bg-secondary/20">
                                                        <TableCell className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                                                            {tx.created_at ? format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm') : '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getTransactionTypeBadge(tx.type)}
                                                        </TableCell>
                                                        <TableCell className={`font-semibold text-sm ${isCredit ? 'text-emerald-600' : isPlan ? 'text-indigo-600' : 'text-foreground'}`}>
                                                            {isCredit ? '+' : '−'}₹{Number(tx.amount_inr).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="capitalize text-xs font-medium">
                                                            <Badge variant="outline">{tx.provider ?? '—'}</Badge>
                                                        </TableCell>
                                                        <TableCell className="capitalize text-xs">
                                                            {tx.service_type ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate" title={tx.notes ?? ''}>
                                                            {tx.notes ?? '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={tx.status === 'completed' || !tx.status ? 'default' : 'destructive'} className="text-[10px] uppercase font-bold py-0.5 px-1.5">
                                                                {tx.status ?? 'completed'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="orders" className="space-y-4">
                            <div className="rounded-md border max-h-[40vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-secondary sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead>Created At</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Currency</TableHead>
                                            <TableHead>Razorpay Order ID</TableHead>
                                            <TableHead>Razorpay Payment ID</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ordersLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                                    Loading recharge orders...
                                                </TableCell>
                                            </TableRow>
                                        ) : paymentOrders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No Razorpay recharge orders found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paymentOrders.map((order) => {
                                                const isPaid = order.status === 'paid';
                                                const isFailed = order.status === 'failed';
                                                return (
                                                    <TableRow key={order.id} className="hover:bg-secondary/20">
                                                        <TableCell className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                                                            {order.created_at ? format(new Date(order.created_at), 'MMM dd, yyyy HH:mm') : '—'}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-sm">
                                                            ₹{Number(order.amount_inr).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-xs uppercase font-mono">{order.currency}</TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">{order.razorpay_order_id}</TableCell>
                                                        <TableCell className="font-mono text-xs">{order.razorpay_payment_id ?? '—'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={isPaid ? 'default' : isFailed ? 'destructive' : 'secondary'} className={`text-[10px] uppercase font-bold py-0.5 px-1.5 ${isPaid ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                                                                {order.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
};
