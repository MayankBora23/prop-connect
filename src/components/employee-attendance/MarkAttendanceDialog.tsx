import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMarkAttendance } from '@/hooks/useEmployeeAttendance';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Employee } from '@/hooks/useEmployees';
import type { EmployeeAttendance } from '@/hooks/useEmployeeAttendance';

const attendanceSchema = z.object({
  status: z.enum(['present', 'absent', 'half_day', 'leave']),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  leave_type: z.enum(['casual', 'sick', 'paid', 'unpaid']).optional(),
  remarks: z.string().max(500).optional(),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

interface MarkAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  attendanceDate: string;
  existingAttendance?: EmployeeAttendance | null;
}

export function MarkAttendanceDialog({
  open,
  onOpenChange,
  employee,
  attendanceDate,
  existingAttendance
}: MarkAttendanceDialogProps) {
  const { toast } = useToast();
  const markAttendance = useMarkAttendance();

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      status: 'present',
      check_in_time: '',
      check_out_time: '',
      leave_type: undefined,
      remarks: '',
    },
  });

  // Reset form when dialog opens or employee changes
  useEffect(() => {
    if (open && employee) {
      form.reset({
        status: existingAttendance?.status || 'present',
        check_in_time: existingAttendance?.check_in_time || '',
        check_out_time: existingAttendance?.check_out_time || '',
        leave_type: existingAttendance?.leave_type || undefined,
        remarks: existingAttendance?.remarks || '',
      });
    }
  }, [open, employee, existingAttendance, form]);

  const onSubmit = async (data: AttendanceFormData) => {
    if (!employee || !attendanceDate) return;

    try {
      await markAttendance.mutateAsync({
        employee_id: employee.id,
        attendance_date: attendanceDate,
        status: data.status,
        check_in_time: data.check_in_time || null,
        check_out_time: data.check_out_time || null,
        leave_type: data.status === 'leave' ? data.leave_type : null,
        remarks: data.remarks || null,
      });

      toast({
        title: 'Attendance marked',
        description: `${employee.full_name}'s attendance has been ${existingAttendance ? 'updated' : 'marked'} for ${new Date(attendanceDate).toLocaleDateString()}.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Mark attendance error:', error);
      const description = error?.message || error?.error || JSON.stringify(error) || 'Failed to mark attendance. Please try again.';
      toast({
        title: 'Error marking attendance',
        description,
        variant: 'destructive',
      });
    }
  };

  const watchStatus = form.watch('status');
  const isLeave = watchStatus === 'leave';

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>
            Mark attendance for {employee.full_name} on {new Date(attendanceDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Employee Info */}
            <div className="p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-medium">{employee.full_name}</p>
                  <p className="text-sm text-muted-foreground">{employee.employee_id} • {employee.role}</p>
                  {employee.department && (
                    <p className="text-sm text-muted-foreground">{employee.department}</p>
                  )}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendance Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchStatus === 'present' || watchStatus === 'half_day' ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="check_in_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="check_out_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {isLeave && (
              <FormField
                control={form.control}
                name="leave_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="casual">Casual Leave</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="paid">Paid Leave</SelectItem>
                        <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks / Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any remarks or notes..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={markAttendance.isPending}>
                {markAttendance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingAttendance ? 'Update Attendance' : 'Mark Attendance'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}