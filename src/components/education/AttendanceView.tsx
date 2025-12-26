import { useState } from 'react';
import { useBatches } from '@/hooks/useBatches';
import { useTeachers } from '@/hooks/useTeachers';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar, Users, GraduationCap, ArrowLeft, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { BatchAttendanceDialog } from './BatchAttendanceDialog';
import { TeacherAttendanceDialog } from './TeacherAttendanceDialog';
import type { Batch } from '@/hooks/useBatches';

function BatchCard({ batch, onMarkAttendance }: { batch: any; onMarkAttendance: (batch: Batch) => void }) {
  const courseName = Array.isArray(batch.courses)
    ? batch.courses[0]?.name
    : batch.courses?.name || '-';

  return (
    <div className="card-elevated p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg">{batch.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            <GraduationCap className="w-4 h-4 inline mr-1" />
            {courseName}
          </p>
        </div>
        <Button
          onClick={() => onMarkAttendance(batch)}
          className="shrink-0"
          size="sm"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Mark Attendance
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Start Date</p>
          <p className="font-medium">{format(new Date(batch.start_date), 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-muted-foreground">End Date</p>
          <p className="font-medium">
            {batch.end_date ? format(new Date(batch.end_date), 'MMM d, yyyy') : 'Ongoing'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Schedule</p>
          <p className="font-medium">{batch.schedule || 'Not specified'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Max Students</p>
          <p className="font-medium">{batch.max_students || 'Unlimited'}</p>
        </div>
      </div>

      {batch.instructor_id && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">Instructor</p>
          <p className="font-medium">{(batch as any).teachers?.name || 'Not assigned'}</p>
        </div>
      )}
    </div>
  );
}

export function AttendanceView() {
  const { data: batches, isLoading: batchesLoading } = useBatches();
  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [teacherAttendanceDialogOpen, setTeacherAttendanceDialogOpen] = useState(false);

  const handleMarkAttendance = (batch: Batch) => {
    setSelectedBatch(batch);
    setAttendanceDialogOpen(true);
  };

  const activeTeachers = teachers?.filter((teacher: any) => teacher.status === 'active') || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Management</h1>
          <p className="text-muted-foreground mt-1">
            Mark attendance for students and teachers using the calendar interface
          </p>
        </div>
      </div>

      {/* Attendance Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Attendance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Student Attendance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batchesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-elevated p-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))
            ) : (batches || []).length === 0 ? (
              <div className="col-span-full card-elevated p-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Batches Found</h3>
                <p className="text-muted-foreground">
                  Create your first batch to start managing attendance.
                </p>
              </div>
            ) : (
              (batches || []).map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  onMarkAttendance={handleMarkAttendance}
                />
              ))
            )}
          </div>
        </div>

        {/* Teacher Attendance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Teacher Attendance</h2>
          </div>

          <div className="card-elevated p-6 hover:shadow-md transition-shadow">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xl mx-auto">
                <UserCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Teacher Attendance</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Mark attendance for {activeTeachers.length} active teacher{activeTeachers.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                onClick={() => setTeacherAttendanceDialogOpen(true)}
                className="w-full"
                disabled={teachersLoading}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Mark Teacher Attendance
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Dialogs */}
      <BatchAttendanceDialog
        batch={selectedBatch}
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
      />

      <TeacherAttendanceDialog
        open={teacherAttendanceDialogOpen}
        onOpenChange={setTeacherAttendanceDialogOpen}
      />
    </div>
  );
}
