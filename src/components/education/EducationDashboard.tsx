import { useStudents } from '@/hooks/useStudents';
import { useCourses } from '@/hooks/useCourses';
import { useBatches } from '@/hooks/useBatches';
import { useEnrollments } from '@/hooks/useEnrollments';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, GraduationCap, Calendar, TrendingUp, DollarSign, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = ['hsl(230, 80%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];

export function EducationDashboard() {
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: batches, isLoading: batchesLoading } = useBatches();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();

  const isLoading = studentsLoading || coursesLoading || batchesLoading || enrollmentsLoading;

  // Calculate basic stats
  const totalStudents = students?.length || 0;
  const totalCourses = courses?.length || 0;
  const totalBatches = batches?.length || 0;
  const activeEnrollments = enrollments?.filter(e => e.status === 'active').length || 0;

  // Calculate new students (today and last 7 days)
  const today = format(new Date(), 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const newStudentsToday = students?.filter(student =>
    format(new Date(student.created_at), 'yyyy-MM-dd') === today
  ).length || 0;

  const newStudentsLast7Days = students?.filter(student =>
    format(new Date(student.created_at), 'yyyy-MM-dd') >= sevenDaysAgo
  ).length || 0;

  // Calculate converted students (enrolled)
  const enrolledStudents = students?.filter(student => student.stage === 'enrolled').length || 0;
  const conversionRate = totalStudents > 0 ? Math.round((enrolledStudents / totalStudents) * 100) : 0;

  // Calculate fees from enrollments
  const totalFeesCollected = enrollments?.reduce((sum, enrollment) =>
    sum + (enrollment.fees_paid || 0), 0) || 0;

  const totalPendingFees = enrollments?.reduce((sum, enrollment) =>
    sum + (enrollment.fees_pending || 0), 0) || 0;

  const totalFees = enrollments?.reduce((sum, enrollment) =>
    sum + (enrollment.total_fees || 0), 0) || 0;

  // Calculate students by stage for pie chart
  const studentsByStage = students?.reduce((acc, student) => {
    const stage = student.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const studentsByStageData = Object.entries(studentsByStage)
    .map(([stage, count]) => ({ stage, count }));

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          iconBg="bg-blue-500"
        />
        <StatCard
          title="New Today"
          value={newStudentsToday}
          icon={TrendingUp}
          iconBg="gradient-success"
        />
        <StatCard
          title="New This Week"
          value={newStudentsLast7Days}
          icon={Calendar}
          iconBg="gradient-info"
        />
        <StatCard
          title="Enrolled Students"
          value={enrolledStudents}
          change={`${conversionRate}% conversion rate`}
          changeType="positive"
          icon={GraduationCap}
          iconBg="gradient-success"
        />
        <StatCard
          title="Total Courses"
          value={totalCourses}
          icon={BookOpen}
          iconBg="bg-green-500"
        />
        <StatCard
          title="Active Batches"
          value={totalBatches}
          icon={Calendar}
          iconBg="bg-orange-500"
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Enrollments"
          value={activeEnrollments}
          icon={CheckCircle}
          iconBg="bg-purple-500"
        />
        <StatCard
          title="Total Fees"
          value={`₹${totalFees.toLocaleString()}`}
          icon={DollarSign}
          iconBg="bg-emerald-500"
        />
        <StatCard
          title="Fees Collected"
          value={`₹${totalFeesCollected.toLocaleString()}`}
          change={`${totalFees > 0 ? Math.round((totalFeesCollected / totalFees) * 100) : 0}% collected`}
          changeType="positive"
          icon={DollarSign}
          iconBg="gradient-success"
        />
        <StatCard
          title="Pending Fees"
          value={`₹${totalPendingFees.toLocaleString()}`}
          icon={Clock}
          iconBg="bg-yellow-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Pipeline Distribution */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Student Pipeline Distribution</h3>
          <div className="h-64">
            {studentsByStageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studentsByStageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="stage"
                  >
                    {studentsByStageData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>
          {studentsByStageData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {studentsByStageData.map((item, index) => (
                <div key={item.stage} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{item.stage}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fees Overview Chart */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Fees Overview</h3>
          <div className="h-64">
            {totalFees > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  {
                    name: 'Fees',
                    Collected: totalFeesCollected,
                    Pending: totalPendingFees
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']}
                  />
                  <Bar dataKey="Collected" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Pending" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No fee data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Students */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Students</h3>
        {students && students.length > 0 ? (
          <div className="space-y-3">
            {students.slice(0, 5).map((student) => (
              <div key={student.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary transition-colors">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold text-sm">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.phone} • {student.stage.replace('_', ' ')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  student.stage === 'enrolled' ? 'bg-success/10 text-success' :
                  student.stage === 'interested' ? 'bg-primary/10 text-primary' :
                  student.stage === 'new_students' ? 'bg-info/10 text-info' :
                  student.stage === 'lost' ? 'bg-destructive/10 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {student.stage.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No students yet. Add your first student to get started.
          </div>
        )}
      </div>
    </div>
  );
}

