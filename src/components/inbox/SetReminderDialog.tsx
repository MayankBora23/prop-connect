import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateNotification } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SetReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  contactName: string;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function SetReminderDialog({
  open,
  onOpenChange,
  conversationId,
  contactName,
}: SetReminderDialogProps) {
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('10:00');
  const [note, setNote] = useState('');
  const insertNotification = useCreateNotification();

  const today = toDateInputValue(new Date());

  useEffect(() => {
    if (!open) return;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setReminderDate(toDateInputValue(d));
    setReminderTime('10:00');
  }, [open]);

  const scheduledFor = useMemo(() => {
    if (!reminderDate || !reminderTime) return null;
    return new Date(`${reminderDate}T${reminderTime}:00`);
  }, [reminderDate, reminderTime]);

  const isPastDateTime = useMemo(() => {
    if (!scheduledFor) return false;
    const minAllowed = new Date(Date.now() + 60_000);
    return scheduledFor < minAllowed;
  }, [scheduledFor]);

  const previewText = useMemo(() => {
    if (!scheduledFor || isPastDateTime) return null;
    return `You'll be reminded on ${format(scheduledFor, 'EEEE, d MMMM yyyy')} at ${format(scheduledFor, 'h:mm a')}`;
  }, [scheduledFor, isPastDateTime]);

  const applyPreset = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    setReminderDate(toDateInputValue(d));
  };

  const handleSetReminder = async () => {
    if (!scheduledFor || isPastDateTime || !conversationId) return;

    try {
      await insertNotification.mutateAsync({
        type: 'whatsapp_reminder',
        title: `Follow up with ${contactName}`,
        message: note.trim() || `Reminder to follow up with ${contactName} on WhatsApp.`,
        related_id: conversationId,
        scheduled_for: scheduledFor.toISOString(),
        is_reminder_fired: false,
        read: false,
      });
      toast.success(`Reminder set for ${format(scheduledFor, 'dd MMM yyyy')} at ${reminderTime}`);
      onOpenChange(false);
      setNote('');
    } catch {
      toast.error('Failed to set reminder. Please try again.');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNote('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Set Follow-up Reminder
          </DialogTitle>
          <DialogDescription>
            Remind me to follow up with {contactName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(0)}>
              Today
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(1)}>
              Tomorrow
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(3)}>
              3 Days
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(7)}>
              1 Week
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reminder-date">Date</Label>
            <Input
              id="reminder-date"
              type="date"
              min={today}
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reminder-time">Time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reminder-note">Note (optional)</Label>
            <Textarea
              id="reminder-note"
              placeholder="What should you follow up about?"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              rows={3}
            />
          </div>

          {isPastDateTime && (
            <p className="text-sm text-destructive">
              Reminder must be at least 1 minute from now.
            </p>
          )}

          {previewText && (
            <p className="text-sm text-muted-foreground">{previewText}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={insertNotification.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSetReminder}
            disabled={insertNotification.isPending || !reminderDate || isPastDateTime}
          >
            {insertNotification.isPending ? 'Setting...' : 'Set Reminder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
