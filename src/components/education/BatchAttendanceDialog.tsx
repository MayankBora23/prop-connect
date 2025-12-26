import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, CheckCircle, XCircle, Clock, ArrowLeft, Save, Users } from 'lucide-react';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { useBatchEnrollments, useAttendanceByDate, useBulkAttendance, type AttendanceStatus } from '@/hooks/useAttendance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Batch } from '@/hooks/useBatches';

interface StudentAttendance {
  enrollment_id: string;
  student_name: string;
  student_id: string;
  status: AttendanceStatus;
}

export function BatchAttendanceDialog({
  batch,
  open,
  onOpenChange
}: {
  batch: Batch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: enrollments, isLoading: enrollmentsLoading } = useBatchEnrollments(batch?.id);
  const { data: existingAttendance, isLoading: attendanceLoading } = useAttendanceByDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined);
  const bulkAttendanceMutation = useBulkAttendance();

  // Filter existing attendance for current batch students
  const batchAttendance = existingAttendance?.filter(att =>
    enrollments?.some((enrollment: any) => enrollment.id === att.enrollment_id)
  ) || [];

  // Debug logging
  React.useEffect(() => {
    if (enrollments && existingAttendance && selectedDate) {
      console.log('Attendance Debug:', {
        date: format(selectedDate, 'yyyy-MM-dd'),
        totalEnrollments: enrollments.length,
        totalAttendanceRecords: existingAttendance.length,
        batchAttendanceRecords: batchAttendance.length,
        batchAttendance: batchAttendance
      });
    }
  }, [enrollments, existingAttendance, selectedDate, batchAttendance]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // Don't reset studentAttendances here - let the useEffect handle initialization
  };

  const initializeStudentAttendances = () => {
    if (!enrollments || !selectedDate) return;

    const attendances: StudentAttendance[] = enrollments.map((enrollment: any) => {
      const existing = batchAttendance.find(att => att.enrollment_id === enrollment.id);
      return {
        enrollment_id: enrollment.id,
        student_name: enrollment.students?.name || 'Unknown Student',
        student_id: enrollment.student_id,
        status: existing?.status || 'present'
      };
    });

    setStudentAttendances(attendances);
  };

  const updateStudentAttendance = (enrollmentId: string, status: AttendanceStatus) => {
    setStudentAttendances(prev =>
      prev.map(att =>
        att.enrollment_id === enrollmentId ? { ...att, status } : att
      )
    );
  };

  const saveAttendance = async () => {
    if (!selectedDate || !batch || !enrollments) return;

    setIsSaving(true);
    try {
      const attendanceDate = format(selectedDate, 'yyyy-MM-dd');

      // First, delete existing attendance records for this date and batch enrollments
      const enrollmentIds = enrollments.map((enrollment: any) => enrollment.id);

      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .in('enrollment_id', enrollmentIds)
        .eq('attendance_date', attendanceDate);

      if (deleteError) throw deleteError;

      // Then insert new attendance records
      const attendances = studentAttendances.map(att => ({
        enrollment_id: att.enrollment_id,
        attendance_date: attendanceDate,
        status: att.status,
        notes: null,
        marked_by: null // This should be set to current user ID
      }));

      await bulkAttendanceMutation.mutateAsync({ attendances });
      toast.success(`Attendance marked for ${format(selectedDate, 'MMM d, yyyy')}`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save attendance');
      console.error('Attendance save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  // Initialize student attendances when enrollments or date changes
  React.useEffect(() => {
    if (enrollments && selectedDate && !attendanceLoading) {
      initializeStudentAttendances();
    }
  }, [enrollments, selectedDate, attendanceLoading]);

  const courseName = Array.isArray((batch as any)?.courses)
    ? (batch as any)?.courses[0]?.name
    : (batch as any)?.courses?.name || '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarIcon className="w-5 h-5" />
            <span className="truncate">Mark Attendance - {batch?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Batch Info */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">{batch?.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Course</p>
                <p className="font-medium">{courseName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Schedule</p>
                <p className="font-medium">{batch?.schedule || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Instructor</p>
                <p className="font-medium">{(batch as any)?.teachers?.name || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Enrolled Students</p>
                <p className="font-medium">{enrollments?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-1">
              <h4 className="font-semibold text-foreground mb-4">Select Date</h4>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border w-full"
                disabled={(date) => date > new Date()}
              />
              {selectedDate && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                  {batchAttendance.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {batchAttendance.length} of {enrollments?.length || 0} students marked
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Students List */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground">
                  Students ({enrollments?.length || 0})
                </h4>
                {studentAttendances.length > 0 && enrollments && enrollments.length > 0 && (
                  <Button
                    onClick={saveAttendance}
                    disabled={isSaving || enrollmentsLoading}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Attendance'}
                  </Button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {enrollmentsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))
                ) : enrollments && enrollments.length > 0 ? (
                  enrollments.map((enrollment: any) => {
                    const attendance = studentAttendances.find(
                      att => att.enrollment_id === enrollment.id
                    );

                    return (
                      <div key={enrollment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
                            {enrollment.students?.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{enrollment.students?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Enrolled: {format(new Date(enrollment.enrollment_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {attendance && (
                            <div className="flex gap-1">
                              {(['present', 'absent'] as AttendanceStatus[]).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => updateStudentAttendance(enrollment.id, status)}
                                  className={`p-2 rounded border transition-colors ${
                                    attendance.status === status
                                      ? getStatusColor(status)
                                      : 'border-border hover:bg-secondary'
                                  }`}
                                  title={status.charAt(0).toUpperCase() + status.slice(1)}
                                >
                                  {getStatusIcon(status)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No enrolled students in this batch</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
