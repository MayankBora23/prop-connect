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
import { useUpdateEnrollment } from '@/hooks/useEnrollments';
import { useToast } from '@/hooks/use-toast';
import { useTeachers } from '@/hooks/useTeachers';
import { useBatches } from '@/hooks/useBatches';
import { GraduationCap, Loader2 } from 'lucide-react';
import type { Enrollment } from '@/hooks/useEnrollments';

const enrollmentSchema = z.object({
  batch_id: z.string().min(1, 'Batch is required'),
  enrollment_date: z.string().min(1, 'Enrollment date is required'),
  status: z.enum(['active', 'completed']),
  total_fees: z.coerce.number().min(0, 'Total fees must be 0 or greater'),
  fees_paid: z.coerce.number().min(0, 'Fees paid must be 0 or greater'),
  fees_pending: z.coerce.number().min(0, 'Fees pending must be 0 or greater'),
  teacher_id: z.string().optional(),
  notes: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

interface EditEnrollmentDialogProps {
  enrollment: Enrollment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEnrollmentDialog({ enrollment, open, onOpenChange }: EditEnrollmentDialogProps) {
  const { toast } = useToast();
  const updateEnrollment = useUpdateEnrollment();
  const { data: teachers } = useTeachers();
  const { data: batches } = useBatches();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      batch_id: '',
      enrollment_date: '',
      status: 'active',
      total_fees: 0,
      fees_paid: 0,
      fees_pending: 0,
      teacher_id: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (enrollment) {
      form.reset({
        batch_id: enrollment.batch_id,
        enrollment_date: enrollment.enrollment_date.split('T')[0], // Format for date input
        status: enrollment.status,
        total_fees: enrollment.total_fees || 0,
        fees_paid: enrollment.fees_paid || 0,
        fees_pending: enrollment.fees_pending || 0,
        teacher_id: enrollment.teacher_id || '',
        notes: enrollment.notes || '',
      });
    }
  }, [enrollment, form]);

  // Auto-calculate fees_pending when total_fees or fees_paid changes
  useEffect(() => {
    const totalFees = form.watch('total_fees') || 0;
    const feesPaid = form.watch('fees_paid') || 0;
    const pending = Math.max(0, totalFees - feesPaid);
    form.setValue('fees_pending', pending);
  }, [form.watch('total_fees'), form.watch('fees_paid')]);

  const onSubmit = async (data: EnrollmentFormData) => {
    if (!enrollment) return;

    try {
      await updateEnrollment.mutateAsync({
        id: enrollment.id,
        batch_id: data.batch_id,
        enrollment_date: data.enrollment_date,
        status: data.status,
        total_fees: data.total_fees,
        fees_paid: data.fees_paid,
        fees_pending: data.fees_pending,
        teacher_id: data.teacher_id || null,
        notes: data.notes || null,
      });

      toast({
        title: 'Enrollment Updated',
        description: 'Enrollment details have been updated successfully.',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Update enrollment error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to update enrollment. Please try again.';
      toast({
        title: 'Error updating enrollment',
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
            Edit Enrollment
          </DialogTitle>
          <DialogDescription>
            Update enrollment details, fees, and teacher assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch_id">Batch *</Label>
              <Select
                value={form.watch('batch_id')}
                onValueChange={(value) => form.setValue('batch_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches?.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.batch_id && (
                <p className="text-sm text-destructive">{form.formState.errors.batch_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollment_date">Admission Date *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="fees_pending">Fees Pending (Auto-calculated)</Label>
              <Input
                id="fees_pending"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('fees_pending')}
                readOnly
                className="bg-muted"
              />
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
            <Button type="submit" disabled={updateEnrollment.isPending}>
              {updateEnrollment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Update Enrollment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
