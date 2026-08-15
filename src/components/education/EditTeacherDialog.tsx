import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateTeacher } from '@/hooks/useTeachers';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2, Plus, X } from 'lucide-react';
import type { Teacher } from '@/hooks/useTeachers';

const teacherSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15).optional().or(z.literal('')),
  qualifications: z.array(z.string()).optional(),
  subjects: z.array(z.string()).min(1, 'At least one subject is required'),
  experience_years: z.coerce.number().min(0, 'Experience cannot be negative').optional(),
  specialization: z.string().max(100).optional(),
  joining_date: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  salary: z.coerce.number().min(0, 'Salary cannot be negative').optional(),
  address: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface EditTeacherDialogProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTeacherDialog({ teacher, open, onOpenChange }: EditTeacherDialogProps) {
  const { toast } = useToast();
  const updateTeacher = useUpdateTeacher();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentQualification, setCurrentQualification] = useState('');

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      qualifications: [],
      subjects: [],
      experience_years: undefined,
      specialization: '',
      joining_date: '',
      status: 'active',
      salary: undefined,
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (teacher) {
      const teacherSubjects = teacher.subjects || [];
      const teacherQualifications = teacher.qualifications || [];
      setSubjects(teacherSubjects);
      setQualifications(teacherQualifications);

      form.reset({
        name: teacher.name,
        email: teacher.email || '',
        phone: teacher.phone || '',
        qualifications: teacherQualifications,
        subjects: teacherSubjects,
        experience_years: teacher.experience_years || undefined,
        specialization: teacher.specialization || '',
        joining_date: teacher.joining_date || '',
        status: teacher.status,
        salary: teacher.salary || undefined,
        address: teacher.address || '',
        notes: teacher.notes || '',
      });
    }
  }, [teacher, form]);

  const addSubject = () => {
    if (currentSubject.trim() && !subjects.includes(currentSubject.trim())) {
      const newSubjects = [...subjects, currentSubject.trim()];
      setSubjects(newSubjects);
      form.setValue('subjects', newSubjects);
      setCurrentSubject('');
    }
  };

  const removeSubject = (subject: string) => {
    const newSubjects = subjects.filter(s => s !== subject);
    setSubjects(newSubjects);
    form.setValue('subjects', newSubjects);
  };

  const addQualification = () => {
    if (currentQualification.trim() && !qualifications.includes(currentQualification.trim())) {
      const newQualifications = [...qualifications, currentQualification.trim()];
      setQualifications(newQualifications);
      form.setValue('qualifications', newQualifications);
      setCurrentQualification('');
    }
  };

  const removeQualification = (qualification: string) => {
    const newQualifications = qualifications.filter(q => q !== qualification);
    setQualifications(newQualifications);
    form.setValue('qualifications', newQualifications);
  };

  const onSubmit = async (data: TeacherFormData) => {
    if (!teacher) return;

    try {
      await updateTeacher.mutateAsync({
        id: teacher.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        qualifications: data.qualifications || [],
        subjects: data.subjects,
        experience_years: data.experience_years || null,
        specialization: data.specialization || null,
        joining_date: data.joining_date || null,
        status: data.status,
        salary: data.salary || null,
        address: data.address || null,
        notes: data.notes || null,
      });

      toast({
        title: 'Teacher Updated',
        description: 'Teacher details have been updated successfully.',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Update teacher error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to update teacher. Please try again.';
      toast({
        title: 'Error updating teacher',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Edit Teacher
          </DialogTitle>
          <DialogDescription>
            Update teacher details, qualifications, and subjects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter teacher name"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                {...form.register('phone')}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                placeholder="e.g., Mathematics, Science"
                {...form.register('specialization')}
              />
              {form.formState.errors.specialization && (
                <p className="text-sm text-destructive">{form.formState.errors.specialization.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience_years">Experience (Years)</Label>
              <Input
                id="experience_years"
                type="number"
                min="0"
                placeholder="Years of teaching experience"
                {...form.register('experience_years')}
              />
              {form.formState.errors.experience_years && (
                <p className="text-sm text-destructive">{form.formState.errors.experience_years.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="joining_date">Joining Date</Label>
              <Input
                id="joining_date"
                type="date"
                {...form.register('joining_date')}
              />
              {form.formState.errors.joining_date && (
                <p className="text-sm text-destructive">{form.formState.errors.joining_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value: 'active' | 'inactive') => form.setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Salary (₹)</Label>
              <Input
                id="salary"
                type="number"
                min="0"
                step="0.01"
                placeholder="Monthly salary"
                {...form.register('salary')}
              />
              {form.formState.errors.salary && (
                <p className="text-sm text-destructive">{form.formState.errors.salary.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subjects *</Label>
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
            {form.formState.errors.subjects && (
              <p className="text-sm text-destructive">{form.formState.errors.subjects.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Qualifications</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Enter qualification (e.g., B.Ed, M.Sc)"
                value={currentQualification}
                onChange={(e) => setCurrentQualification(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQualification())}
              />
              <Button type="button" variant="outline" onClick={addQualification}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {qualifications.map((qualification) => (
                <div key={qualification} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md">
                  <span className="text-sm">{qualification}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => removeQualification(qualification)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            {form.formState.errors.qualifications && (
              <p className="text-sm text-destructive">{form.formState.errors.qualifications.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter teacher address"
              className="resize-none"
              rows={2}
              {...form.register('address')}
            />
            {form.formState.errors.address && (
              <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the teacher"
              className="resize-none"
              rows={2}
              {...form.register('notes')}
            />
            {form.formState.errors.notes && (
              <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
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
            <Button type="submit" disabled={updateTeacher.isPending}>
              {updateTeacher.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Update Teacher
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
