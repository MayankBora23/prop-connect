import React, { useState } from 'react';
import { BookOpen, Clock, Users, IndianRupee, Edit, Trash2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Course } from '@/hooks/useCourses';
import { useDeleteCourse } from '@/hooks/useCourses';
import { useProfiles } from '@/hooks/useProfiles';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { EditCourseDialog } from './EditCourseDialog';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const deleteCourse = useDeleteCourse();
  const { data: profiles } = useProfiles();

  const instructor = profiles?.find(p => p.user_id === course.instructor_id);

  const handleDelete = async () => {
    try {
      await deleteCourse.mutateAsync(course.id);
      toast.success(`${course.name} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${course.name}`);
    }
  };

  const getCourseTypeColor = (type: string) => {
    switch (type) {
      case 'online': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'offline': return 'bg-green-100 text-green-800 border-green-200';
      case 'hybrid': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'archived': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <div className="card-elevated overflow-hidden animate-scale-in group">
      <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-12 h-12 mx-auto text-primary mb-2" />
          <div className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
            getCourseTypeColor(course.course_type)
          )}>
            {course.course_type.charAt(0).toUpperCase() + course.course_type.slice(1)}
          </div>
        </div>

        <div className={cn(
          'absolute top-3 left-3 text-xs px-2 py-1 rounded-full font-medium border',
          getStatusColor(course.status)
        )}>
          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
        </div>

        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <AlertDialogTitle>Delete Course</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {course.name}? This action cannot be undone.
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
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-1">{course.name}</h3>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {course.description || 'No description available'}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{course.duration_months} months</span>
          </div>

          {course.max_students && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Max {course.max_students} students</span>
            </div>
          )}

          {instructor && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>{instructor.name}</span>
            </div>
          )}
        </div>

        {course.subjects_covered && course.subjects_covered.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Subjects:</p>
            <div className="flex flex-wrap gap-1">
              {course.subjects_covered.slice(0, 3).map((subject) => (
                <span
                  key={subject}
                  className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
                >
                  {subject}
                </span>
              ))}
              {course.subjects_covered.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{course.subjects_covered.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-primary font-bold text-lg">
            <IndianRupee className="w-5 h-5" />
            <span>{course.price}</span>
          </div>
          {/* <Button size="sm" className="gradient-primary border-0">
            View Details
          </Button> */}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditCourseDialog
        course={course}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
