import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEnrollment } from '@/hooks/useEnrollments';
import { useToast } from '@/hooks/use-toast';
import { useTeachers } from '@/hooks/useTeachers';
import { useBatches } from '@/hooks/useBatches';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Loader2 } from 'lucide-react';

const enrollmentSchema = z.object({
  batch_id: z.string().min(1, 'Batch is required'),
  enrollment_date: z.string().min(1, 'Enrollment date is required'),
  status: z.enum(['active', 'completed']),
  total_fees: z.coerce.number().min(0, 'Total fees must be 0 or greater'),
  fees_paid: z.coerce.number().min(0, 'Fees paid must be 0 or greater'),
  teacher_id: z.string().optional(),
  notes: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

interface AddEnrollmentDialogProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEnrollmentDialog({ studentId, studentName, open, onOpenChange }: AddEnrollmentDialogProps) {
  const { toast } = useToast();
  const createEnrollment = useCreateEnrollment();
  const { data: teachers } = useTeachers();
  const { data: batches } = useBatches();
  const { user } = useAuth();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      batch_id: '',
      enrollment_date: new Date().toISOString().split('T')[0], // Today's date
      status: 'active',
      total_fees: 0,
      fees_paid: 0,
      teacher_id: '',
      notes: '',
    },
  });

  // Auto-calculate fees_pending when total_fees or fees_paid changes
  useEffect(() => {
    // Note: fees_pending is calculated in the backend or can be derived from total_fees - fees_paid
  }, [form.watch('total_fees'), form.watch('fees_paid')]);

  const onSubmit = async (data: EnrollmentFormData) => {
    try {
      await createEnrollment.mutateAsync({
        student_id: studentId,
        batch_id: data.batch_id,
        enrollment_date: data.enrollment_date,
        status: data.status,
        total_fees: data.total_fees,
        fees_paid: data.fees_paid,
        fees_pending: data.total_fees - data.fees_paid, // Auto-calculate
        teacher_id: data.teacher_id || null,
        notes: data.notes || null,
        created_by: user?.id || null,
      });

      toast({
        title: 'Enrollment Created',
        description: `${studentName} has been successfully enrolled.`,
      });

      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Create enrollment error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create enrollment. Please try again.';
      toast({
        title: 'Error creating enrollment',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Enroll Student: {studentName}
          </DialogTitle>
          <DialogDescription>
            Create an enrollment record for this student with batch assignment and fee details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch_id">Batch & Course *</Label>
              <Select
                value={form.watch('batch_id')}
                onValueChange={(value) => form.setValue('batch_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select batch and course" />
                </SelectTrigger>
                <SelectContent>
                  {batches?.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name} {batch.courses ? `- ${batch.courses.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.batch_id && (
                <p className="text-sm text-destructive">{form.formState.errors.batch_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollment_date">Enrollment Date *</Label>
              <Input
                id="enrollment_date"
                type="date"
                {...form.register('enrollment_date')}
              />
              {form.formState.errors.enrollment_date && (
                <p className="text-sm text-destructive">{form.formState.errors.enrollment_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value: 'active' | 'completed') => form.setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher_id">Teacher Assigned</Label>
            <Select
              value={form.watch('teacher_id') || 'unassigned'}
              onValueChange={(value) => form.setValue('teacher_id', value === 'unassigned' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Not assigned</SelectItem>
                  {teachers?.filter(teacher => teacher.status === 'active').map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_fees">Total Fees *</Label>
              <Input
                id="total_fees"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('total_fees')}
              />
              {form.formState.errors.total_fees && (
                <p className="text-sm text-destructive">{form.formState.errors.total_fees.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fees_paid">Fees Paid *</Label>
              <Input
                id="fees_paid"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('fees_paid')}
              />
              {form.formState.errors.fees_paid && (
                <p className="text-sm text-destructive">{form.formState.errors.fees_paid.message}</p>
              )}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <strong>Fees Pending:</strong> ₹{(form.watch('total_fees') - form.watch('fees_paid')).toLocaleString()}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the enrollment"
              className="resize-none"
              rows={3}
              {...form.register('notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createEnrollment.isPending}>
              {createEnrollment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Enrollment...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Create Enrollment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
