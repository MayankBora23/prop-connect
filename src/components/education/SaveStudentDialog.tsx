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
import { useCreateStudent } from '@/hooks/useStudents';
import { WhatsAppConversation } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';

interface SaveStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppConversation;
}

export function SaveStudentDialog({ open, onOpenChange, conversation }: SaveStudentDialogProps) {
  const [studentName, setStudentName] = useState(conversation.contact_name || '');
  const [studentEmail, setStudentEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [stage, setStage] = useState<'new_students' | 'contacted' | 'demo_scheduled' | 'demo_attended' | 'interested' | 'fees_discussed' | 'enrolled' | 'lost'>('new_students');

  const createStudent = useCreateStudent();

  const handleSave = async () => {
    try {
      if (!studentName.trim()) {
        toast.error('Student name is required');
        return;
      }

      // Format phone number with +91 if not already present
      const phoneNumber = conversation.contact_phone.startsWith('+91')
        ? conversation.contact_phone
        : `+91${conversation.contact_phone}`;

      await createStudent.mutateAsync({
        name: studentName.trim(),
        phone: phoneNumber,
        email: studentEmail.trim() || undefined,
        parent_name: parentName.trim() || undefined,
        parent_phone: parentPhone.trim() || undefined,
        parent_email: undefined,
        stage: stage,
        date_of_birth: undefined, // Can be added later if needed
        address: undefined, // Can be added later if needed
        notes: undefined,
        tags: undefined,
        assigned_to: undefined,
        created_by: undefined,
      });

      toast.success('Student created successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create student');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStudentName(conversation.contact_name || '');
      setStudentEmail('');
      setParentName('');
      setParentPhone('');
      setStage('new_students');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save as Student</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="student-name">Student Name *</Label>
            <Input
              id="student-name"
              placeholder="Enter student name..."
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !createStudent.isPending && handleSave()}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="student-email">Email (Optional)</Label>
            <Input
              id="student-email"
              type="email"
              placeholder="Enter email address..."
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="parent-name">Parent Name (Optional)</Label>
            <Input
              id="parent-name"
              placeholder="Enter parent name..."
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="parent-phone">Parent Phone (Optional)</Label>
            <Input
              id="parent-phone"
              placeholder="Enter parent phone..."
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stage">Student Stage</Label>
            <Select value={stage} onValueChange={(value: 'new_students' | 'contacted' | 'demo_scheduled' | 'demo_attended' | 'interested' | 'fees_discussed' | 'enrolled' | 'lost') => setStage(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_students">New Students</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                <SelectItem value="demo_attended">Demo Attended</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="fees_discussed">Fees Discussed</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
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
            disabled={createStudent.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createStudent.isPending || !studentName.trim()}
          >
            {createStudent.isPending ? 'Creating...' : 'Create Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}