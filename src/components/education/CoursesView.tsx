import { useCourses } from '@/hooks/useCourses';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Filter, Download } from 'lucide-react';

export function CoursesView() {
  const { data: courses, isLoading } = useCourses();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Courses</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-elevated p-4">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))
        ) : (courses || []).length === 0 ? (
          <div className="col-span-full card-elevated p-8 text-center text-muted-foreground">
            No courses found. Add your first course to get started.
          </div>
        ) : (
          (courses || []).map((course) => (
            <div key={course.id} className="card-elevated p-4 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="font-semibold text-foreground mb-2">{course.name}</h3>
              {course.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
              )}
              <div className="flex items-center justify-between text-sm">
                {course.duration_months && (
                  <span className="text-muted-foreground">Duration: {course.duration_months} months</span>
                )}
                {course.price && (
                  <span className="font-medium text-primary">{course.price}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

