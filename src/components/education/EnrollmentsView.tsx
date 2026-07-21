import { useState, useMemo } from 'react';
import { useEnrolledStudents, useDeleteEnrollment } from '@/hooks/useEnrollments';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Edit, Trash2, GraduationCap, CreditCard } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { EditEnrollmentDialog } from './EditEnrollmentDialog';
import { AddEnrollmentDialog } from './AddEnrollmentDialog';
import { InstallmentDialog } from './InstallmentDialog';
import type { EnrollmentStatus } from '@/hooks/useEnrollments';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';

function EnrollmentRow({ student, enrollment }: { student: any; enrollment: any }) {
  const deleteEnrollment = useDeleteEnrollment();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);

  const teacher = enrollment?.teachers?.name || 'Not assigned';

  const handleDelete = async () => {
    if (!enrollment) return;
    try {
      await deleteEnrollment.mutateAsync(enrollment.id);
      toast.success('Enrollment deleted successfully');
    } catch (error) {
      toast.error('Failed to delete enrollment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <tr className="hover:bg-secondary/50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
              {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{student.name}</p>
              <p className="text-xs text-muted-foreground">{student.phone}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {enrollment?.batches?.courses?.name || 'N/A'}
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {enrollment?.batches?.name || 'N/A'}
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {enrollment ? format(new Date(enrollment.enrollment_date), 'MMM d, yyyy') : 'Not enrolled'}
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {teacher}
        </td>
        <td className="px-4 py-3">
          {enrollment ? (
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(enrollment.status)}`}>
              {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
            </span>
          ) : (
            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              Ready to Enroll
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-foreground">
          {enrollment ? `₹${enrollment.total_fees?.toLocaleString() || '0'}` : 'N/A'}
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {enrollment ? `₹${enrollment.fees_paid?.toLocaleString() || '0'}` : 'N/A'}
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {enrollment ? `₹${enrollment.fees_pending?.toLocaleString() || '0'}` : 'N/A'}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            {enrollment ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setInstallmentDialogOpen(true)}
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Enrollment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this enrollment? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => setAddDialogOpen(true)}
              >
                <GraduationCap className="w-4 h-4 mr-1" />
                Enroll
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Edit Dialog */}
      {enrollment && (
        <EditEnrollmentDialog
          enrollment={enrollment}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Add Enrollment Dialog */}
      <AddEnrollmentDialog
        studentId={student.id}
        studentName={student.name}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Installment Dialog */}
      {enrollment && (
        <InstallmentDialog
          enrollment={enrollment}
          studentName={student.name}
          open={installmentDialogOpen}
          onOpenChange={setInstallmentDialogOpen}
        />
      )}
    </>
  );
}

export function EnrollmentsView() {
  const [filter, setFilter] = useState<'all' | EnrollmentStatus>('all');
  const { data: enrolledStudents, isLoading } = useEnrolledStudents();
  const { search } = useSectionSearch();

  const filteredStudents = useMemo(() => {
    const statusFiltered = (enrolledStudents || []).filter((student) => {
      if (filter === 'all') return true;
      const enrollment = student.enrollment;
      return enrollment ? enrollment.status === filter : filter === 'active';
    });
    return filterBySearch(statusFiltered, search, (student) => [
      student.name,
      student.phone,
      student.email,
      student.enrollment?.courses?.name,
      student.enrollment?.batches?.name,
      student.enrollment?.status,
    ]);
  }, [enrolledStudents, filter, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'active', 'completed'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Enrollments Table */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teacher</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Fees</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-14" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                </tr>
              ))
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  {filter === 'all'
                    ? 'No enrollments found. Students in the "Enrolled" stage will appear here.'
                    : `No ${filter} enrollments found with the selected filter.`
                  }
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <EnrollmentRow
                  key={student.id}
                  student={student}
                  enrollment={student.enrollment}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
