import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@//components/ui/button';
import { Calendar } from '@//components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, CheckCircle, Clock, XCircle, Save, Users } from 'lucide-react';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { useTeachers, type Teacher } from '@/hooks/useTeachers';
import { useTeacherAttendance, useBulkTeacherAttendance, type TeacherAttendanceStatus } from '@/hooks/useAttendance';
import { toast } from 'sonner';

interface TeacherAttendanceData {
  teacher_id: string;
  teacher_name: string;
  teacher_phone: string | null;
  status: TeacherAttendanceStatus;
}

export function TeacherAttendanceDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [teacherAttendances, setTeacherAttendances] = useState<TeacherAttendanceData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: existingAttendance, isLoading: attendanceLoading } = useTeacherAttendance(
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
  );
  const bulkTeacherAttendanceMutation = useBulkTeacherAttendance();

  // Filter existing attendance for current teachers
  const teacherAttendanceMap = existingAttendance?.reduce((acc, att) => {
    acc[att.teacher_id] = att;
    return acc;
  }, {} as Record<string, any>) || {};

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setTeacherAttendances([]);
  };

  const initializeTeacherAttendances = () => {
    if (!teachers || !selectedDate) return;

    const attendances: TeacherAttendanceData[] = teachers
      .filter((teacher: any) => teacher.status === 'active')
      .map((teacher: any) => {
        const existing = teacherAttendanceMap[teacher.id];
        return {
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          teacher_phone: teacher.phone,
          status: existing?.status || 'present'
        };
      });

    setTeacherAttendances(attendances);
  };

  const updateTeacherAttendance = (teacherId: string, status: TeacherAttendanceStatus) => {
    setTeacherAttendances(prev =>
      prev.map(att =>
        att.teacher_id === teacherId ? { ...att, status } : att
      )
    );
  };

  const saveTeacherAttendance = async () => {
    if (!selectedDate || !teachers) return;

    setIsSaving(true);
    try {
      const attendanceDate = format(selectedDate, 'yyyy-MM-dd');

      // Prepare teacher attendance records
      const attendances = teacherAttendances.map(att => ({
        teacher_id: att.teacher_id,
        attendance_date: attendanceDate,
        status: att.status,
        notes: null,
        marked_by: null // This should be set to current user ID
      }));

      await bulkTeacherAttendanceMutation.mutateAsync({ attendances });
      toast.success(`Teacher attendance marked for ${format(selectedDate, 'MMM d, yyyy')}`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save teacher attendance');
      console.error('Teacher attendance save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status: TeacherAttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'half_day':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: TeacherAttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'half_day':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  // Initialize teacher attendances when teachers or date changes
  React.useEffect(() => {
    if (teachers && selectedDate && !attendanceLoading) {
      initializeTeacherAttendances();
    }
  }, [teachers, selectedDate, attendanceLoading]);

  const activeTeachers = teachers?.filter((teacher: any) => teacher.status === 'active') || [];
  const markedTeachers = Object.keys(teacherAttendanceMap).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarIcon className="w-5 h-5" />
            <span className="truncate">Mark Teacher Attendance</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Active Teachers</p>
                <p className="font-medium">{activeTeachers.length}</p>
              </div>
              {selectedDate && (
                <>
                  <div>
                    <p className="text-muted-foreground">Selected Date</p>
                    <p className="font-medium">{format(selectedDate, 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Already Marked</p>
                    <p className="font-medium">{markedTeachers} of {activeTeachers.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{markedTeachers === activeTeachers.length ? 'Complete' : 'Pending'}</p>
                  </div>
                </>
              )}
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
                  {markedTeachers > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {markedTeachers} of {activeTeachers.length} teachers marked
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Teachers List */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground">
                  Teachers ({activeTeachers.length})
                </h4>
                {teacherAttendances.length > 0 && activeTeachers.length > 0 && (
                  <Button
                    onClick={saveTeacherAttendance}
                    disabled={isSaving || teachersLoading}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Attendance'}
                  </Button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {teachersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))
                ) : activeTeachers.length > 0 ? (
                  activeTeachers.map((teacher: any) => {
                    const attendance = teacherAttendances.find(
                      att => att.teacher_id === teacher.id
                    );

                    return (
                      <div key={teacher.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
                            {teacher.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{teacher.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {teacher.phone || 'No phone'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {attendance && (
                            <div className="flex gap-1">
                              {(['present', 'half_day', 'absent'] as TeacherAttendanceStatus[]).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => updateTeacherAttendance(teacher.id, status)}
                                  className={`p-2 rounded border transition-colors ${
                                    attendance.status === status
                                      ? getStatusColor(status)
                                      : 'border-border hover:bg-secondary'
                                  }`}
                                  title={status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                    <p>No active teachers found</p>
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
