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
import { useUpdateBatch } from '@/hooks/useBatches';
import { useCourses } from '@/hooks/useCourses';
import { useTeachers } from '@/hooks/useTeachers';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2 } from 'lucide-react';
import type { Batch } from '@/hooks/useBatches';

const batchSchema = z.object({
  course_id: z.string().min(1, 'Course is required'),
  name: z.string().min(1, 'Batch name is required').max(100),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  schedule: z.string().max(200).optional(),
  max_students: z.coerce.number().min(1, 'Maximum students must be at least 1').optional(),
  instructor_id: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

interface EditBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: Batch | null;
}

export function EditBatchDialog({ open, onOpenChange, batch }: EditBatchDialogProps) {
  const { toast } = useToast();
  const updateBatch = useUpdateBatch();
  const { data: courses } = useCourses();
  const { data: teachers } = useTeachers();

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      course_id: '',
      name: '',
      start_date: '',
      end_date: '',
      schedule: '',
      max_students: undefined,
      instructor_id: '',
    },
  });

  // Pre-populate form when batch changes
  useEffect(() => {
    if (batch) {
      form.reset({
        course_id: batch.course_id,
        name: batch.name,
        start_date: batch.start_date,
        end_date: batch.end_date || '',
        schedule: batch.schedule || '',
        max_students: batch.max_students || undefined,
        instructor_id: batch.instructor_id || 'unassigned',
      });
    }
  }, [batch, form]);

  const onSubmit = async (data: BatchFormData) => {
    if (!batch) return;

    try {
      await updateBatch.mutateAsync({
        id: batch.id,
        ...data,
        end_date: data.end_date || null,
        schedule: data.schedule || null,
        max_students: data.max_students || null,
        instructor_id: data.instructor_id === 'unassigned' ? null : data.instructor_id || null,
      });

      toast({
        title: 'Success',
        description: 'Batch updated successfully',
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update batch',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Edit Batch
          </DialogTitle>
          <DialogDescription>
            Update batch details and assignments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="course_id">Course *</Label>
            <Select
              value={form.watch('course_id')}
              onValueChange={(value) => form.setValue('course_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.course_id && (
              <p className="text-sm text-destructive">{form.formState.errors.course_id.message}</p>
            )}
          </div>

          {/* Batch Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Batch Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Enter batch name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                {...form.register('start_date')}
              />
              {form.formState.errors.start_date && (
                <p className="text-sm text-destructive">{form.formState.errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                {...form.register('end_date')}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule</Label>
            <Textarea
              id="schedule"
              {...form.register('schedule')}
              placeholder="Enter batch schedule (e.g., Monday, Wednesday, Friday - 10:00 AM to 12:00 PM)"
              rows={3}
            />
            {form.formState.errors.schedule && (
              <p className="text-sm text-destructive">{form.formState.errors.schedule.message}</p>
            )}
          </div>

          {/* Max Students & Instructor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_students">Max Students</Label>
              <Input
                id="max_students"
                type="number"
                {...form.register('max_students', { valueAsNumber: true })}
                placeholder="Enter maximum students"
                min="1"
              />
              {form.formState.errors.max_students && (
                <p className="text-sm text-destructive">{form.formState.errors.max_students.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor_id">Instructor</Label>
              <Select
                value={form.watch('instructor_id')}
                onValueChange={(value) => form.setValue('instructor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">No instructor</SelectItem>
                  {teachers?.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateBatch.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateBatch.isPending}>
              {updateBatch.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Batch'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
