import { useState } from 'react';
import { useEmployeeAttendanceHistory, useAttendanceStats } from '@/hooks/useEmployeeAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, TrendingUp, Clock, BarChart3, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function AttendanceStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    present: { label: 'Present', className: 'bg-green-100 text-green-800' },
    absent: { label: 'Absent', className: 'bg-red-100 text-red-800' },
    half_day: { label: 'Half Day', className: 'bg-yellow-100 text-yellow-800' },
    leave: { label: 'Leave', className: 'bg-blue-100 text-blue-800' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.present;

  return (
    <Badge variant="secondary" className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}

function formatDuration(duration: string | null): string {
  if (!duration) return '-';

  // Parse PostgreSQL interval format (HH:MM:SS)
  const [hours, minutes] = duration.split(':').slice(0, 2);
  return `${hours}h ${minutes}m`;
}

function AttendanceStatsCard({ stats, title }: { stats: any; title: string }) {
  if (!stats) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.present_days}</div>
            <div className="text-sm text-muted-foreground">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.absent_days}</div>
            <div className="text-sm text-muted-foreground">Absent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.half_days}</div>
            <div className="text-sm text-muted-foreground">Half Day</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.leave_days}</div>
            <div className="text-sm text-muted-foreground">Leave</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Hours</span>
            <span className="font-semibold">{stats.total_hours.toFixed(1)}h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeeAttendanceHistory() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: employees, isLoading: employeesLoading } = useEmployees();

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case '7days':
        return {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case '30days':
        return {
          start: format(subDays(today, 30), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case '90days':
        return {
          start: format(subDays(today, 90), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'custom':
        return {
          start: startDate,
          end: endDate
        };
      default:
        return {
          start: format(subDays(today, 30), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
    }
  };

  const { start, end } = getDateRange();

  const { data: attendanceHistory, isLoading: historyLoading } = useEmployeeAttendanceHistory(
    selectedEmployee,
    start,
    end
  );

  const { data: stats } = useAttendanceStats(selectedEmployee, start, end);

  // Filter attendance by status
  const filteredHistory = attendanceHistory?.filter(attendance =>
    statusFilter === 'all' || attendance.status === statusFilter
  ) || [];

  const selectedEmployeeData = employees?.find(emp => emp.id === selectedEmployee);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Employee Attendance History</h3>
        <p className="text-sm text-muted-foreground">
          View detailed attendance history for individual employees
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} - {employee.employee_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Date Range</label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Info and Stats */}
      {selectedEmployee && selectedEmployeeData && (
        <div className="grid gap-6">
          {/* Employee Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {selectedEmployeeData.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{selectedEmployeeData.full_name}</h4>
                  <p className="text-muted-foreground">{selectedEmployeeData.employee_id} • {selectedEmployeeData.role}</p>
                  {selectedEmployeeData.department && (
                    <p className="text-sm text-muted-foreground">{selectedEmployeeData.department}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <AttendanceStatsCard
            stats={stats}
            title={`Attendance Summary (${start} to ${end})`}
          />

          {/* Attendance History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No attendance records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-3 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">Check In</th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">Check Out</th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">Duration</th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">Leave Type</th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-muted/50">
                          <td className="py-3 text-sm">
                            {format(new Date(record.attendance_date), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3">
                            <AttendanceStatusBadge status={record.status} />
                          </td>
                          <td className="py-3 text-sm">{record.check_in_time || '-'}</td>
                          <td className="py-3 text-sm">{record.check_out_time || '-'}</td>
                          <td className="py-3 text-sm">{formatDuration(record.work_duration)}</td>
                          <td className="py-3 text-sm capitalize">{record.leave_type || '-'}</td>
                          <td className="py-3 text-sm">{record.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Placeholder when no employee selected */}
      {!selectedEmployee && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select an employee to view their attendance history</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}