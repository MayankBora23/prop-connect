import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateCourse } from '@/hooks/useCourses';
import { useToast } from '@/hooks/use-toast';
import { useTeachers } from '@/hooks/useTeachers';
import { BookOpen, Loader2, Plus, X } from 'lucide-react';
import type { Course } from '@/hooks/useCourses';

const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(100),
  description: z.string().max(1000).optional(),
  duration_months: z.coerce.number().min(1, 'Duration must be at least 1 month'),
  price: z.string().min(1, 'Total fees is required'),
  course_type: z.enum(['online', 'offline', 'hybrid']),
  subjects_covered: z.array(z.string()).min(1, 'At least one subject is required'),
  max_students: z.coerce.number().min(1, 'Maximum students must be at least 1'),
  status: z.enum(['active', 'archived']),
  instructor_id: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface EditCourseDialogProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCourseDialog({ course, open, onOpenChange }: EditCourseDialogProps) {
  const { toast } = useToast();
  const updateCourse = useUpdateCourse();
  const { data: teachers } = useTeachers();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [currentSubject, setCurrentSubject] = useState('');

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: '',
      description: '',
      duration_months: 1,
      price: '',
      course_type: 'offline',
      subjects_covered: [],
      max_students: 1,
      status: 'active',
      instructor_id: '',
    },
  });

  useEffect(() => {
    if (course) {
      const courseSubjects = course.subjects_covered || [];
      setSubjects(courseSubjects);
      form.reset({
        name: course.name,
        description: course.description || '',
        duration_months: course.duration_months || 1,
        price: course.price || '',
        course_type: course.course_type || 'offline',
        subjects_covered: courseSubjects,
        max_students: course.max_students || 1,
        status: course.status || 'active',
        instructor_id: course.instructor_id || '',
      });
    }
  }, [course, form]);

  const addSubject = () => {
    if (currentSubject.trim() && !subjects.includes(currentSubject.trim())) {
      const newSubjects = [...subjects, currentSubject.trim()];
      setSubjects(newSubjects);
      form.setValue('subjects_covered', newSubjects);
      setCurrentSubject('');
    }
  };

  const removeSubject = (subject: string) => {
    const newSubjects = subjects.filter(s => s !== subject);
    setSubjects(newSubjects);
    form.setValue('subjects_covered', newSubjects);
  };

  const onSubmit = async (data: CourseFormData) => {
    if (!course) return;

    try {
      await updateCourse.mutateAsync({
        id: course.id,
        name: data.name,
        description: data.description || null,
        duration_months: data.duration_months,
        price: data.price,
        course_type: data.course_type,
        subjects_covered: data.subjects_covered,
        max_students: data.max_students,
        status: data.status,
        instructor_id: data.instructor_id || null,
      });

      toast({
        title: 'Course Updated',
        description: 'Course has been updated successfully.',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Update course error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to update course. Please try again.';
      toast({
        title: 'Error updating course',
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
            <BookOpen className="w-5 h-5" />
            Edit Course
          </DialogTitle>
          <DialogDescription>
            Update course information including details, faculty assignment, and status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                placeholder="Enter course name"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="course_type">Course Type *</Label>
              <Select
                value={form.watch('course_type')}
                onValueChange={(value: 'online' | 'offline' | 'hybrid') => form.setValue('course_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.course_type && (
                <p className="text-sm text-destructive">{form.formState.errors.course_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (Months) *</Label>
              <Input
                id="duration_months"
                type="number"
                min="1"
                placeholder="Enter duration in months"
                {...form.register('duration_months')}
              />
              {form.formState.errors.duration_months && (
                <p className="text-sm text-destructive">{form.formState.errors.duration_months.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Total Fees *</Label>
              <Input
                id="price"
                placeholder="Enter total fees (e.g., ₹50,000)"
                {...form.register('price')}
              />
              {form.formState.errors.price && (
                <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_students">Max Students *</Label>
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
              <Label htmlFor="status">Status *</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value: 'active' | 'archived') => form.setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor_id">Faculty Assigned</Label>
            <Select
              value={form.watch('instructor_id') || 'unassigned'}
              onValueChange={(value) => form.setValue('instructor_id', value === 'unassigned' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select faculty member" />
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
            <Label>Subjects Covered *</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Enter subject name"
                value={currentSubject}
                onChange={(e) => setCurrentSubject(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
              />
              <Button type="button" variant="outline" onClick={addSubject}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <div key={subject} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md">
                  <span className="text-sm">{subject}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => removeSubject(subject)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            {form.formState.errors.subjects_covered && (
              <p className="text-sm text-destructive">{form.formState.errors.subjects_covered.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter course description"
              className="resize-none"
              rows={3}
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateCourse.isPending}>
              {updateCourse.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Course...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Update Course
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
