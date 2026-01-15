import { useState } from 'react';
import { useMonthlyAttendance, useAttendanceStats } from '@/hooks/useEmployeeAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthlyAttendanceViewProps {
  selectedEmployee?: string;
}

function AttendanceDay({ date, attendance, isCurrentMonth }: {
  date: Date;
  attendance: any;
  isCurrentMonth: boolean;
}) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'half_day': return 'bg-yellow-500';
      case 'leave': return 'bg-blue-500';
      default: return 'bg-gray-200';
    }
  };

  return (
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
      isCurrentMonth ? getStatusColor(attendance?.status) : 'bg-gray-100 text-gray-400',
      attendance?.status ? 'text-white' : 'text-gray-600'
    )}>
      {format(date, 'd')}
    </div>
  );
}

function EmployeeMonthlyCard({ employee, year, month }: {
  employee: any;
  year: number;
  month: number;
}) {
  const { data: monthlyAttendance, isLoading } = useMonthlyAttendance(employee.id, year, month);
  const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const { data: stats } = useAttendanceStats(employee.id, startDate, endDate);

  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const attendanceMap = new Map(
    monthlyAttendance?.map(att => [att.attendance_date, att]) || []
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
            {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          {employee.full_name}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {employee.role} • {employee.employee_id}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Attendance Grid */}
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground p-1">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map(date => (
            <div key={date.toISOString()} className="p-1 flex justify-center">
              <AttendanceDay
                date={date}
                attendance={attendanceMap.get(format(date, 'yyyy-MM-dd'))}
                isCurrentMonth={true}
              />
            </div>
          ))}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{stats.present_days}</div>
              <div className="text-xs text-muted-foreground">Present</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{stats.absent_days}</div>
              <div className="text-xs text-muted-foreground">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">{stats.half_days}</div>
              <div className="text-xs text-muted-foreground">Half Day</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{stats.leave_days}</div>
              <div className="text-xs text-muted-foreground">Leave</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthlyAttendanceView({ selectedEmployee }: MonthlyAttendanceViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState(selectedEmployee || 'all');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: employees, isLoading: employeesLoading } = useEmployees();

  const filteredEmployees = selectedEmployeeFilter === 'all'
    ? employees
    : employees?.filter(emp => emp.id === selectedEmployeeFilter);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Monthly Attendance - {format(currentDate, 'MMMM yyyy')}
          </h3>
          <p className="text-sm text-muted-foreground">
            View attendance summary for the selected month
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 px-3 py-1 border rounded-md">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(currentDate, 'MMM yyyy')}
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees?.map(employee => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.full_name} - {employee.employee_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Overview Cards */}
      {employeesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEmployees?.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No employees found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees?.map(employee => (
            <EmployeeMonthlyCard
              key={employee.id}
              employee={employee}
              year={currentYear}
              month={currentMonth}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-200"></div>
              <span className="text-sm">Not Marked</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}