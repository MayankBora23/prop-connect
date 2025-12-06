import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Lead, LeadStage } from '@/data/mockData';

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSubmit: (data: Partial<Lead>) => Promise<void>;
}

const stages: LeadStage[] = ['new', 'contacted', 'follow-up', 'site-visit', 'negotiation', 'closed-won', 'closed-lost'];

export function LeadForm({ open, onOpenChange, lead, onSubmit }: LeadFormProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({
    name: '',
    phone: '',
    email: '',
    budget: '',
    location: '',
    propertyType: '',
    source: '',
    stage: 'new',
    assignedTo: '',
    tags: [],
    notes: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    if (lead) {
      setFormData(lead);
      setTagInput(lead.tags?.join(', ') || '');
      setNoteInput(lead.notes?.join(', ') || '');
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        budget: '',
        location: '',
        propertyType: '',
        source: '',
        stage: 'new',
        assignedTo: '',
        tags: [],
        notes: [],
      });
      setTagInput('');
      setNoteInput('');
    }
  }, [lead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
      const notes = noteInput.split(',').map(n => n.trim()).filter(Boolean);
      await onSubmit({
        ...formData,
        tags,
        notes,
        createdAt: formData.createdAt || new Date().toISOString().split('T')[0],
        lastContact: formData.lastContact || new Date().toISOString().split('T')[0],
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Update lead details' : 'Add a new lead to your pipeline'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source || ''}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                  <SelectItem value="99acres">99acres</SelectItem>
                  <SelectItem value="MagicBricks">MagicBricks</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Whitefield, Bangalore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Input
                id="propertyType"
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                placeholder="e.g., 3 BHK"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g., ₹50L - ₹75L"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={formData.stage || 'new'}
                onValueChange={(value) => setFormData({ ...formData, stage: value as LeadStage })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Input
              id="assignedTo"
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              placeholder="Agent name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g., Hot Lead, Premium, Ready to Buy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (comma-separated)</Label>
            <Textarea
              id="notes"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g., Interested in east-facing property, Prefers gated community"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : lead ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

