import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDeleteWhatsAppConversation, WhatsAppConversation } from '@/hooks/useWhatsApp';
import { AlertTriangle } from 'lucide-react';

interface DeleteContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppConversation;
  onSuccess?: () => void;
}

export function DeleteContactDialog({ open, onOpenChange, conversation, onSuccess }: DeleteContactDialogProps) {
  const [deleteMessages, setDeleteMessages] = useState(false);
  const deleteConversation = useDeleteWhatsAppConversation();

  const handleDelete = async () => {
    try {
      await deleteConversation.mutateAsync({
        conversationId: conversation.id,
        deleteMessages,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDeleteMessages(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete Contact
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this contact? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                {conversation.contact_name || conversation.contact_phone}
              </p>
              <p className="text-xs text-muted-foreground">
                {conversation.contact_phone}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-messages"
              checked={deleteMessages}
              onCheckedChange={(checked) => setDeleteMessages(checked as boolean)}
            />
            <Label
              htmlFor="delete-messages"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Also delete all message history
            </Label>
          </div>
          <div className="text-xs text-muted-foreground">
            {deleteMessages
              ? "This will permanently delete the contact and all their messages."
              : "The contact will be deleted but message history will be preserved."
            }
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteConversation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteConversation.isPending}
          >
            {deleteConversation.isPending ? 'Deleting...' : 'Delete Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}