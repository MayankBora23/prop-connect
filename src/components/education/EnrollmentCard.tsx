import React, { useState } from 'react';
import { Calendar, GraduationCap, BookOpen, User, IndianRupee, Edit, Trash2, CheckCircle, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Enrollment } from '@/hooks/useEnrollments';
import { useDeleteEnrollment } from '@/hooks/useEnrollments';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { EditEnrollmentDialog } from './EditEnrollmentDialog';
import { AddEnrollmentDialog } from './AddEnrollmentDialog';

interface EnrollmentCardProps {
  student: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  enrollment: Enrollment | null;
}

export function EnrollmentCard({ student, enrollment }: EnrollmentCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const deleteEnrollment = useDeleteEnrollment();

  const batch = enrollment?.batches;
  const course = batch?.courses;

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
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="card-elevated overflow-hidden animate-scale-in group">
      <div className="relative h-32 bg-gradient-to-br from-green-500/20 to-green-600/5 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-12 h-12 mx-auto text-green-600 mb-2" />
          <div className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
            enrollment ? getStatusColor(enrollment.status) : 'bg-yellow-100 text-yellow-800 border-yellow-200'
          )}>
            {enrollment ? (
              <>
                {getStatusIcon(enrollment.status)}
                <span className="ml-1">{enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span className="ml-1">Ready to Enroll</span>
              </>
            )}
          </div>
        </div>

        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {enrollment ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-4 h-4" />
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
              variant="secondary"
              className="h-8 px-2"
              onClick={(e) => {
                e.stopPropagation();
                setAddDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Enroll
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-foreground text-lg mb-2">
          {student?.name || 'Unknown Student'}
        </h3>

        <p className="text-sm text-muted-foreground mb-3">
          {student?.phone || 'No phone'}
        </p>

        <div className="space-y-2 mb-4">
          {enrollment && course?.name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>Course: {course.name}</span>
            </div>
          )}

          {enrollment && batch?.name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="w-4 h-4" />
              <span>Batch: {batch.name}</span>
            </div>
          )}

          {enrollment && teacher && teacher !== 'Not assigned' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Teacher: {teacher}</span>
            </div>
          )}

          {enrollment && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Enrolled: {format(new Date(enrollment.enrollment_date), 'MMM d, yyyy')}</span>
            </div>
          )}

          {!enrollment && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Clock className="w-4 h-4" />
              <span>Ready for enrollment</span>
            </div>
          )}
        </div>

        {/* Fee Information - Only show if enrollment exists */}
        {enrollment && (
          <div className="space-y-2 mb-4 p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Fees:</span>
              <span className="font-medium flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                {enrollment.total_fees?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fees Paid:</span>
              <span className="font-medium text-green-600 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                {enrollment.fees_paid?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-medium text-orange-600 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                {enrollment.fees_pending?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        )}

        {enrollment?.notes && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            <p className="font-medium mb-1">Notes:</p>
            <p className="line-clamp-2">{enrollment.notes}</p>
          </div>
        )}
      </div>

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
    </div>
  );
}
