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
import { useUpdateWhatsAppConversation, WhatsAppConversation } from '@/hooks/useWhatsApp';

interface SaveContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppConversation;
}

export function EditContactDialog({ open, onOpenChange, conversation }: SaveContactDialogProps) {
  const [contactName, setContactName] = useState(conversation.contact_name || '');
  const updateConversation = useUpdateWhatsAppConversation();

  const handleSave = async () => {
    try {
      await updateConversation.mutateAsync({
        id: conversation.id,
        contact_name: contactName.trim() || null,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setContactName(conversation.contact_name || '');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Contact Name</Label>
            <Input
              id="contact-name"
              placeholder="Enter contact name..."
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <p className="text-sm text-muted-foreground">
              Phone: {conversation.contact_phone}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateConversation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateConversation.isPending}
          >
            {updateConversation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}