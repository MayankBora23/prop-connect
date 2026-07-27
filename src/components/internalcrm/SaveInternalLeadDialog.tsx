import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateInternalLead, InternalLeadStage } from '@/hooks/useInternalLeads';
import { WhatsAppConversation } from '@/hooks/useWhatsApp';
import type { Enums } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface SaveInternalLeadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversation: WhatsAppConversation;
}

export function SaveInternalLeadDialog({ open, onOpenChange, conversation }: SaveInternalLeadDialogProps) {
    const [companyName, setCompanyName] = useState('');
    const [leadName, setLeadName] = useState(conversation.contact_name || '');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [industry, setIndustry] = useState<any>('real_estate');
    const [userLimit, setUserLimit] = useState('');
    const [stage, setStage] = useState<InternalLeadStage>('new');

    const createInternalLead = useCreateInternalLead();

    const handleSave = async () => {
        try {
            if (!companyName.trim()) {
                toast.error('Company name is required');
                return;
            }
            if (!leadName.trim()) {
                toast.error('Lead name is required');
                return;
            }

            // Format phone number with +91 if not already present
            const phoneNumber = conversation.contact_phone.startsWith('+91')
                ? conversation.contact_phone
                : `+91${conversation.contact_phone}`;

            await createInternalLead.mutateAsync({
                company_name: companyName.trim(),
                lead_name: leadName.trim(),
                phone_no: phoneNumber,
                email: email.trim() || undefined,
                address: address.trim() || undefined,
                industry: industry,
                user_limit: userLimit ? parseInt(userLimit) : undefined,
                stage: stage,
            });

            toast.success('Internal lead created successfully');
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving internal lead:', error);
            toast.error('Failed to create internal lead');
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setCompanyName('');
            setLeadName(conversation.contact_name || '');
            setEmail('');
            setAddress('');
            setIndustry('real_estate');
            setUserLimit('');
            setStage('new');
        }
        onOpenChange(newOpen);
    };

    const industries: { value: Enums<'industry_type'>; label: string }[] = [
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'education', label: 'Education' },
        { value: 'automobile_dealers', label: 'Automobile Dealers' },
        { value: 'internal_crm', label: 'Internal CRM' },
    ];

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Save as Internal Lead</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="company-name">Company Name *</Label>
                            <Input
                                id="company-name"
                                placeholder="Enter company name..."
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lead-name">Lead Name *</Label>
                            <Input
                                id="lead-name"
                                placeholder="Enter lead name..."
                                value={leadName}
                                onChange={(e) => setLeadName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter email address..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">Address (Optional)</Label>
                        <Input
                            id="address"
                            placeholder="Enter company address..."
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Select value={industry} onValueChange={(value) => setIndustry(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {industries.map((ind) => (
                                        <SelectItem key={ind.value} value={ind.value}>
                                            {ind.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-limit">User Limit</Label>
                            <Input
                                id="user-limit"
                                type="number"
                                placeholder="e.g. 5"
                                value={userLimit}
                                onChange={(e) => setUserLimit(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="stage">Stage</Label>
                        <Select value={stage} onValueChange={(value: InternalLeadStage) => setStage(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                                <SelectItem value="trial_started">Trial Started</SelectItem>
                                <SelectItem value="closed_won">Closed (Won)</SelectItem>
                                <SelectItem value="closed_lost">Closed (Lost)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="text-sm text-muted-foreground bg-secondary/30 p-2 rounded-md">
                        Phone: {conversation.contact_phone}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createInternalLead.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={createInternalLead.isPending || !companyName.trim() || !leadName.trim()}
                        className="gradient-primary"
                    >
                        {createInternalLead.isPending ? 'Saving...' : 'Save Lead'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
