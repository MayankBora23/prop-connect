import { useStudents } from '@/hooks/useStudents';
import { useCourses } from '@/hooks/useCourses';
import { useBatches } from '@/hooks/useBatches';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useAttendance, useTeacherAttendance } from '@/hooks/useAttendance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { TrendingUp, Users, GraduationCap, DollarSign, Calendar, BookOpen, Target, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

const COLORS = ['hsl(230, 80%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];

export function EducationAnalytics() {
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: batches, isLoading: batchesLoading } = useBatches();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();

  const isLoading = studentsLoading || coursesLoading || batchesLoading || enrollmentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Calculate education-specific stats
  const totalStudents = students?.length || 0;
  const enrolledStudents = students?.filter(s => s.stage === 'enrolled').length || 0;
  const conversionRate = totalStudents > 0 ? Math.round((enrolledStudents / totalStudents) * 100) : 0;
  const activeEnrollments = enrollments?.filter(e => e.status === 'active').length || 0;
  const totalCourses = courses?.length || 0;
  const activeBatches = batches?.length || 0;

  // Calculate financial metrics
  const totalFees = enrollments?.reduce((sum, e) => sum + (e.total_fees || 0), 0) || 0;
  const feesCollected = enrollments?.reduce((sum, e) => sum + (e.fees_paid || 0), 0) || 0;
  const feesPending = enrollments?.reduce((sum, e) => sum + (e.fees_pending || 0), 0) || 0;
  const collectionRate = totalFees > 0 ? Math.round((feesCollected / totalFees) * 100) : 0;

  // Students by stage for pie chart
  const studentsByStage = students?.reduce((acc, student) => {
    const stage = student.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const studentsByStageData = Object.entries(studentsByStage)
    .map(([stage, count]) => ({ stage, count }));

  // Enrollment source analysis (simplified - could be enhanced with actual source tracking)
  const enrollmentTrends = students?.reduce((acc, student) => {
    const stage = student.stage;
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const enrollmentTrendsData = Object.entries(enrollmentTrends)
    .map(([stage, count]) => ({ stage: stage.replace('_', ' '), count }))
    .sort((a, b) => b.count - a.count);

  // Weekly student acquisition (last 7 days)
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStudents = students?.filter(s =>
      format(new Date(s.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    ).length || 0;
    const dayEnrollments = students?.filter(s =>
      s.stage === 'enrolled' &&
      format(new Date(s.updated_at || s.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    ).length || 0;

    return {
      day: format(date, 'EEE'),
      newStudents: dayStudents,
      enrollments: dayEnrollments,
    };
  });

  // Course popularity (based on enrollments)
  const coursePopularity = courses?.map(course => {
    const courseEnrollments = enrollments?.filter(e =>
      batches?.some(b => b.id === e.batch_id && b.course_id === course.id)
    ).length || 0;

    return {
      course: course.name,
      enrollments: courseEnrollments,
    };
  }).sort((a, b) => b.enrollments - a.enrollments).slice(0, 5) || [];

  // Monthly fee collection trend (simplified)
  const monthlyFees = Array.from({ length: 6 }).map((_, i) => {
    const date = subDays(new Date(), i * 30);
    const monthFees = enrollments?.filter(e =>
      format(new Date(e.created_at), 'yyyy-MM') === format(date, 'yyyy-MM')
    ).reduce((sum, e) => sum + (e.fees_paid || 0), 0) || 0;

    return {
      month: format(date, 'MMM yyyy'),
      fees: monthFees,
    };
  }).reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-3xl font-bold text-foreground mt-1">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-2">{enrolledStudents} of {totalStudents} students</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalStudents}</p>
              <p className="text-xs text-muted-foreground mt-2">All registered students</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-info flex items-center justify-center">
              <Users className="w-7 h-7 text-info-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fee Collection Rate</p>
              <p className="text-3xl font-bold text-foreground mt-1">{collectionRate}%</p>
              <p className="text-xs text-muted-foreground mt-2">₹{feesCollected.toLocaleString()} collected</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-success flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-success-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Enrollments</p>
              <p className="text-3xl font-bold text-foreground mt-1">{activeEnrollments}</p>
              <p className="text-xs text-muted-foreground mt-2">Currently active</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-warning flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-warning-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Student Acquisition */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Weekly Student Acquisition</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="newStudents" stroke="hsl(230, 80%, 55%)" fillOpacity={1} fill="url(#colorStudents)" strokeWidth={2} name="New Students" />
                <Area type="monotone" dataKey="enrollments" stroke="hsl(142, 76%, 36%)" fillOpacity={1} fill="url(#colorEnrollments)" strokeWidth={2} name="Enrollments" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Pipeline Distribution */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Student Pipeline Distribution</h3>
          <div className="h-72">
            {studentsByStageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studentsByStageData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="stage"
                    label={({ stage, percent }) => `${stage} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
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
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Fee Collection */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Monthly Fee Collection Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyFees}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Fees Collected']}
                />
                <Line type="monotone" dataKey="fees" stroke="hsl(142, 76%, 36%)" strokeWidth={3} dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Popularity */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Course Popularity</h3>
          {coursePopularity.length > 0 ? (
            <div className="space-y-4">
              {coursePopularity.map((course, index) => (
                <div key={course.course} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{course.course}</span>
                    <span className="text-muted-foreground">{course.enrollments} enrollments</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${coursePopularity.length > 0 ? Math.min((course.enrollments / coursePopularity[0].enrollments) * 100, 100) : 0}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No course data available
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Courses</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalCourses}</p>
              <p className="text-xs text-muted-foreground mt-2">Available courses</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-info-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Batches</p>
              <p className="text-2xl font-bold text-foreground mt-1">{activeBatches}</p>
              <p className="text-xs text-muted-foreground mt-2">Running batches</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
              <Calendar className="w-6 h-6 text-success-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground mt-1">₹{feesCollected.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">From all enrollments</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Fees</p>
              <p className="text-2xl font-bold text-foreground mt-1">₹{feesPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Outstanding payments</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-warning flex items-center justify-center">
              <Award className="w-6 h-6 text-warning-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
