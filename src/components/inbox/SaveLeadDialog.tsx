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
import { useCreateLead } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { WhatsAppConversation } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';

interface SaveLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppConversation;
}

export function SaveLeadDialog({ open, onOpenChange, conversation }: SaveLeadDialogProps) {
  const [leadName, setLeadName] = useState(conversation.contact_name || '');
  const [leadEmail, setLeadEmail] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [leadSource, setLeadSource] = useState('WhatsApp');

  const createLead = useCreateLead();
  const { data: profiles } = useProfiles();

  const handleSave = async () => {
    try {
      if (!leadName.trim()) {
        toast.error('Lead name is required');
        return;
      }

      // Format phone number with +91 if not already present
      const phoneNumber = conversation.contact_phone.startsWith('+91')
        ? conversation.contact_phone
        : `+91${conversation.contact_phone}`;

      await createLead.mutateAsync({
        name: leadName.trim(),
        phone: phoneNumber,
        email: leadEmail.trim() || undefined,
        source: leadSource,
        assigned_to: assignedTo || undefined,
        stage: 'new',
        lead_status: 'warm',
      });

      toast.success('Lead created successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create lead');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setLeadName(conversation.contact_name || '');
      setLeadEmail('');
      setAssignedTo('');
      setLeadSource('WhatsApp');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save as Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-name">Lead Name *</Label>
            <Input
              id="lead-name"
              placeholder="Enter lead name..."
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !createLead.isPending && handleSave()}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-email">Email (Optional)</Label>
            <Input
              id="lead-email"
              type="email"
              placeholder="Enter email address..."
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assigned-to">Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {(profiles || []).map(profile => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-source">Source</Label>
            <Select value={leadSource} onValueChange={setLeadSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                <SelectItem value="Google Ads">Google Ads</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="99acres">99acres</SelectItem>
                <SelectItem value="MagicBricks">MagicBricks</SelectItem>
                <SelectItem value="Housing.com">Housing.com</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Walk-in">Walk-in</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Phone: {conversation.contact_phone}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createLead.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createLead.isPending || !leadName.trim()}
          >
            {createLead.isPending ? 'Creating...' : 'Create Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}