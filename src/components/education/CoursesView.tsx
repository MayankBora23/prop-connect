import { useState } from 'react';
import { useCourses } from '@/hooks/useCourses';
import { CourseCard } from './CourseCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Course } from '@/hooks/useCourses';

export function CoursesView() {
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const { data: courses, isLoading } = useCourses();

  const filteredCourses = (courses || []).filter(
    (course) => filter === 'all' || course.status === filter
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'active', 'archived'] as const).map((status) => (
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

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-elevated overflow-hidden">
              <Skeleton className="h-32 w-full rounded-t-lg" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {!isLoading && filteredCourses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {filter === 'all' ? (
            <p>No courses found. Use the "Add Course" button in the header to create your first course.</p>
          ) : (
            <p>No {filter} courses found with the selected filter.</p>
          )}
        </div>
      )}

    </div>
  );
}

