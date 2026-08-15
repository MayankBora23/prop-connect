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
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateAutoLead } from '@/hooks/useAutoLeads';
import { WhatsAppConversation } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';

interface SaveAutoLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppConversation;
}

export function SaveAutoLeadDialog({ open, onOpenChange, conversation }: SaveAutoLeadDialogProps) {
  const [leadName, setLeadName] = useState(conversation.contact_name || '');
  const [leadEmail, setLeadEmail] = useState('');
  const [preferredVehicleType, setPreferredVehicleType] = useState<'car' | 'bike'>('car');
  const [preferredBrand, setPreferredBrand] = useState('');
  const [preferredModel, setPreferredModel] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [financingNeeded, setFinancingNeeded] = useState(false);
  const [insuranceNeeded, setInsuranceNeeded] = useState(false);
  const [testDriveRequested, setTestDriveRequested] = useState(false);
  const [source, setSource] = useState('whatsapp');
  const [status, setStatus] = useState<'new_lead' | 'contacted' | 'test_drive_scheduled' | 'quotation_shared' | 'negotiation_final_discussion' | 'booking_done' | 'delivered_sold'>('new_lead');

  const createAutoLead = useCreateAutoLead();

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

      await createAutoLead.mutateAsync({
        name: leadName.trim(),
        phone: phoneNumber,
        email: leadEmail.trim() || undefined,
        preferred_vehicle_type: preferredVehicleType,
        preferred_brand: preferredBrand.trim() || undefined,
        preferred_model: preferredModel.trim() || undefined,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        financing_needed: financingNeeded,
        insurance_needed: insuranceNeeded,
        test_drive_requested: testDriveRequested,
        source: source,
        status: status,
        notes: [],
        tags: [],
        assigned_to: undefined,
        created_by: undefined,
      });

      toast.success('Auto lead created successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create auto lead');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setLeadName(conversation.contact_name || '');
      setLeadEmail('');
      setPreferredVehicleType('car');
      setPreferredBrand('');
      setPreferredModel('');
      setBudgetMin('');
      setBudgetMax('');
      setFinancingNeeded(false);
      setInsuranceNeeded(false);
      setTestDriveRequested(false);
      setSource('whatsapp');
      setStatus('new_lead');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Save as Auto Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-name">Lead Name *</Label>
            <Input
              id="lead-name"
              placeholder="Enter lead name..."
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !createAutoLead.isPending && handleSave()}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vehicle-type">Preferred Vehicle Type</Label>
              <Select value={preferredVehicleType} onValueChange={(value: 'car' | 'bike') => setPreferredVehicleType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lead-status">Lead Status</Label>
              <Select value={status} onValueChange={(value: 'new_lead' | 'contacted' | 'test_drive_scheduled' | 'quotation_shared' | 'negotiation_final_discussion' | 'booking_done' | 'delivered_sold') => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_lead">New Lead</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="test_drive_scheduled">Test Drive Scheduled</SelectItem>
                  <SelectItem value="quotation_shared">Quotation Shared</SelectItem>
                  <SelectItem value="negotiation_final_discussion">Negotiation/Final Discussion</SelectItem>
                  <SelectItem value="booking_done">Booking Done</SelectItem>
                  <SelectItem value="delivered_sold">Delivered/Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="preferred-brand">Preferred Brand</Label>
              <Input
                id="preferred-brand"
                placeholder="e.g., Toyota, Honda..."
                value={preferredBrand}
                onChange={(e) => setPreferredBrand(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preferred-model">Preferred Model</Label>
              <Input
                id="preferred-model"
                placeholder="e.g., Corolla, City..."
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="budget-min">Budget Min (₹)</Label>
              <Input
                id="budget-min"
                type="number"
                placeholder="Minimum budget..."
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget-max">Budget Max (₹)</Label>
              <Input
                id="budget-max"
                type="number"
                placeholder="Maximum budget..."
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Requirements</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="financing"
                  checked={financingNeeded}
                  onCheckedChange={(checked) => setFinancingNeeded(checked === true)}
                />
                <Label htmlFor="financing" className="text-sm">Needs Financing</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insurance"
                  checked={insuranceNeeded}
                  onCheckedChange={(checked) => setInsuranceNeeded(checked === true)}
                />
                <Label htmlFor="insurance" className="text-sm">Needs Insurance</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="test-drive"
                  checked={testDriveRequested}
                  onCheckedChange={(checked) => setTestDriveRequested(checked === true)}
                />
                <Label htmlFor="test-drive" className="text-sm">Test Drive Requested</Label>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Phone: {conversation.contact_phone}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createAutoLead.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createAutoLead.isPending || !leadName.trim()}
          >
            {createAutoLead.isPending ? 'Creating...' : 'Create Auto Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}