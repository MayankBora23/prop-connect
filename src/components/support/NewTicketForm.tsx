import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTicket } from '@/hooks/useSupport';
import type { TicketCategory, TicketPriority } from '@/types/support';

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

interface NewTicketFormProps {
  onSuccess: () => void;
}

export function NewTicketForm({ onSuccess }: NewTicketFormProps) {
  const createTicket = useCreateTicket();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TicketCategory>('help');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: boolean; description?: boolean }>({});

  const handleSubmit = () => {
    const nextErrors: { title?: boolean; description?: boolean } = {};
    if (!title.trim()) nextErrors.title = true;
    if (description.trim().length < 10) nextErrors.description = true;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    createTicket.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        tags: [],
      },
      {
        onSuccess: (ticket) => {
          const num = (ticket as { ticket_number?: number }).ticket_number;
          toast.success(`Ticket #${num ?? ''} sent`);
          setTitle('');
          setDescription('');
          setCategory('help');
          setPriority('medium');
          setErrors({});
          onSuccess();
        },
        onError: () => {
          toast.error('Could not send ticket. Try again.');
        },
      }
    );
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-20 md:pb-4">
      <div className="space-y-2">
        <Label htmlFor="ticket-title">Subject</Label>
        <Input
          id="ticket-title"
          placeholder="Short summary"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {errors.title && <p className="text-sm text-destructive">Add a subject.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature_request">Feature</SelectItem>
              <SelectItem value="help">Help</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket-desc">Message</Label>
        <Textarea
          id="ticket-desc"
          placeholder="Describe what you need…"
          className="min-h-[100px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {errors.description && (
          <p className="text-sm text-destructive">Please write at least a few words (10+ characters).</p>
        )}
      </div>

      <Button type="button" className="w-full" disabled={createTicket.isPending} onClick={handleSubmit}>
        {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send ticket
      </Button>
    </div>
  );
}
