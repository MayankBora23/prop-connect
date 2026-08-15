import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateBatch } from '@/hooks/useBatches';
import { useCourses } from '@/hooks/useCourses';
import { useTeachers } from '@/hooks/useTeachers';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2 } from 'lucide-react';

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

interface AddBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBatchDialog({ open, onOpenChange }: AddBatchDialogProps) {
  const { toast } = useToast();
  const createBatch = useCreateBatch();
  const { data: courses } = useCourses();
  const { data: teachers } = useTeachers();
  const { user } = useAuth();

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

  const onSubmit = async (data: BatchFormData) => {
    try {
      await createBatch.mutateAsync({
        course_id: data.course_id,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date || null,
        schedule: data.schedule || null,
        max_students: data.max_students || null,
        instructor_id: data.instructor_id || null,
        created_by: user?.id || null,
      });

      toast({
        title: 'Batch Created',
        description: 'Batch has been created successfully.',
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create batch error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create batch. Please try again.';
      toast({
        title: 'Error creating batch',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Add New Batch
          </DialogTitle>
          <DialogDescription>
            Create a new batch for a course with schedule and capacity details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course_id">Course *</Label>
              <Select
                value={form.watch('course_id')}
                onValueChange={(value) => form.setValue('course_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
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

            <div className="space-y-2">
              <Label htmlFor="name">Batch Name *</Label>
              <Input
                id="name"
                placeholder="Enter batch name (e.g., Morning Batch A)"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

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
              {form.formState.errors.end_date && (
                <p className="text-sm text-destructive">{form.formState.errors.end_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_students">Max Students</Label>
              <Input
                id="max_students"
                type="number"
                min="1"
                placeholder="Maximum number of students"
                {...form.register('max_students')}
              />
              {form.formState.errors.max_students && (
                <p className="text-sm text-destructive">{form.formState.errors.max_students.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor_id">Instructor</Label>
              <Select
                value={form.watch('instructor_id') || 'unassigned'}
                onValueChange={(value) => form.setValue('instructor_id', value === 'unassigned' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Not assigned</SelectItem>
                  {teachers?.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule</Label>
            <Textarea
              id="schedule"
              placeholder="Enter class schedule (e.g., Mon-Wed-Fri, 9:00 AM - 11:00 AM)"
              className="resize-none"
              rows={3}
              {...form.register('schedule')}
            />
            {form.formState.errors.schedule && (
              <p className="text-sm text-destructive">{form.formState.errors.schedule.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBatch.isPending}>
              {createBatch.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Batch...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Create Batch
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
