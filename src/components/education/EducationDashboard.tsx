import { useStudents } from '@/hooks/useStudents';
import { useCourses } from '@/hooks/useCourses';
import { useBatches } from '@/hooks/useBatches';
import { useEnrollments } from '@/hooks/useEnrollments';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';

export function EducationDashboard() {
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: batches, isLoading: batchesLoading } = useBatches();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();

  const isLoading = studentsLoading || coursesLoading || batchesLoading || enrollmentsLoading;

  const totalStudents = students?.length || 0;
  const totalCourses = courses?.length || 0;
  const totalBatches = batches?.length || 0;
  const activeEnrollments = enrollments?.filter(e => e.status === 'active').length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Students"
              value={totalStudents}
              icon={() => null}
              iconBg="bg-blue-500"
            />
            <StatCard
              title="Total Courses"
              value={totalCourses}
              icon={() => null}
              iconBg="bg-green-500"
            />
            <StatCard
              title="Active Batches"
              value={totalBatches}
              icon={() => null}
              iconBg="bg-orange-500"
            />
            <StatCard
              title="Active Enrollments"
              value={activeEnrollments}
              icon={() => null}
              iconBg="bg-purple-500"
            />
          </>
        )}
      </div>

      {/* Recent Students */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Students</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : students && students.length > 0 ? (
          <div className="space-y-2">
            {students.slice(0, 5).map((student) => (
              <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.phone}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No students yet. Add your first student to get started.</p>
        )}
      </div>
    </div>
  );
}

