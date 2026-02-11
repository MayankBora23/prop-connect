import { useState } from 'react';
import { useTeachers, useDeleteTeacher, type Teacher } from '@/hooks/useTeachers';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Edit, Trash2, GraduationCap, Mail, Phone } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { EditTeacherDialog } from './EditTeacherDialog';
import type { TeacherStatus } from '@/hooks/useTeachers';

function TeacherRow({ teacher }: { teacher: Teacher }) {
  const deleteTeacherMutation = useDeleteTeacher();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteTeacherMutation.mutateAsync(teacher.id);
      toast.success('Teacher deleted successfully');
    } catch (error) {
      toast.error('Failed to delete teacher');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <tr className="hover:bg-secondary/50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {teacher.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{teacher.name}</p>
              {teacher.specialization && (
                <p className="text-xs text-muted-foreground">{teacher.specialization}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          <div className="flex flex-col gap-1">
            {teacher.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span className="text-xs">{teacher.email}</span>
              </div>
            )}
            {teacher.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span className="text-xs">{teacher.phone}</span>
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {teacher.subjects && teacher.subjects.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {teacher.subjects.slice(0, 2).map((subject: string, index: number) => (
                <span key={index} className="inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {subject}
                </span>
              ))}
              {teacher.subjects.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{teacher.subjects.length - 2} more
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {teacher.experience_years ? `${teacher.experience_years} years` : '-'}
        </td>
        <td className="px-4 py-3 text-sm text-foreground">
          {teacher.joining_date ? format(new Date(teacher.joining_date), 'MMM d, yyyy') : '-'}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(teacher.status)}`}>
            {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-foreground">
          {teacher.salary ? `₹${teacher.salary.toLocaleString()}` : '-'}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4" />
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
                  <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {teacher.name}? This action cannot be undone.
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
          </div>
        </td>
      </tr>

      {/* Edit Dialog */}
      <EditTeacherDialog
        teacher={teacher}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}

export function TeachersView() {
  const [filter, setFilter] = useState<'all' | TeacherStatus>('all');
  const { data: teachers, isLoading } = useTeachers();

  const filteredTeachers = (teachers || []).filter(
    (teacher) => filter === 'all' || teacher.status === filter
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'active', 'inactive'] as const).map((status) => (
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

      {/* Teachers Table */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teacher</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subjects</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experience</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joining Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                </tr>
              ))
            ) : filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {filter === 'all'
                    ? 'No teachers found. Add your first teacher to get started.'
                    : `No ${filter} teachers found with the selected filter.`
                  }
                </td>
              </tr>
            ) : (
              filteredTeachers.map((teacher) => (
                <TeacherRow
                  key={teacher.id}
                  teacher={teacher}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
