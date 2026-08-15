import { useState } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttendanceByDate, useTodayAttendance, useBulkMarkAttendance } from '@/hooks/useEmployeeAttendance';
import type { Employee } from '@/hooks/useEmployees';
import { MarkAttendanceDialog } from './MarkAttendanceDialog';
import { MonthlyAttendanceView } from './MonthlyAttendanceView';
import { EmployeeAttendanceHistory } from './EmployeeAttendanceHistory';
import { LayoutGrid, List, Filter, Download, Upload, Calendar, Users, Clock, CheckCircle, XCircle, Minus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { EmployeeAttendance } from '@/hooks/useEmployeeAttendance';

type ViewMode = 'daily' | 'monthly' | 'employee';

function AttendanceStatusBadge({ status }: { status: EmployeeAttendance['status'] }) {
  const statusConfig = {
    present: { label: 'Present', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
    absent: { label: 'Absent', icon: XCircle, className: 'bg-red-100 text-red-800' },
    half_day: { label: 'Half Day', icon: Minus, className: 'bg-yellow-100 text-yellow-800' },
    leave: { label: 'Leave', icon: UserX, className: 'bg-blue-100 text-blue-800' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={cn('flex items-center gap-1', config.className)}>
      <Icon className="w-3 h-3" />
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

export function AttendanceView() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState(false);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState<Employee | null>(null);

  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: todayAttendance, isLoading: todayLoading } = useTodayAttendance();
  const { data: dateAttendance, isLoading: dateLoading } = useAttendanceByDate(selectedDate);
  const bulkMarkAttendance = useBulkMarkAttendance();

  const currentAttendance = selectedDate === new Date().toISOString().split('T')[0] ? todayAttendance : dateAttendance;
  const isLoading = selectedDate === new Date().toISOString().split('T')[0] ? todayLoading : dateLoading;

  // Filter attendance data
  const filteredAttendance = currentAttendance?.filter(attendance => {
    if (statusFilter !== 'all' && attendance.status !== statusFilter) return false;
    if (departmentFilter !== 'all' && attendance.employee?.department !== departmentFilter) return false;
    return true;
  }) || [];

  // Get unique departments for filter
  const departments = Array.from(new Set(employees?.map(emp => emp.department).filter(Boolean))) as string[];

  const handleMarkAttendance = (employee: Employee) => {
    setSelectedEmployeeForAttendance(employee);
    setMarkAttendanceOpen(true);
  };

  const handleBulkMarkAbsent = async () => {
    if (!employees || !selectedDate) return;

    const absentRecords = employees
      .filter(emp => !currentAttendance?.some(att => att.employee_id === emp.id))
      .map(emp => ({
        employee_id: emp.id,
        attendance_date: selectedDate,
        status: 'absent' as const,
        check_in_time: null,
        check_out_time: null,
        leave_type: null,
        remarks: null,
      }));

    if (absentRecords.length === 0) {
      toast.info('All employees already have attendance marked for today');
      return;
    }

    try {
      await bulkMarkAttendance.mutateAsync(absentRecords);
      toast.success(`Marked ${absentRecords.length} employees as absent`);
    } catch (error) {
      toast.error('Failed to mark employees as absent');
    }
  };

  const getAttendanceForEmployee = (employeeId: string): EmployeeAttendance | undefined => {
    return currentAttendance?.find(att => att.employee_id === employeeId);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant={viewMode === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('daily')}
            className="flex-1 sm:flex-none"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Daily View
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('monthly')}
            className="flex-1 sm:flex-none"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Monthly View
          </Button>
          <Button
            variant={viewMode === 'employee' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('employee')}
            className="flex-1 sm:flex-none"
          >
            <Users className="w-4 h-4 mr-2" />
            Employee View
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap w-full">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-40 flex-1 sm:flex-none">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 flex-1 sm:flex-none">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="half_day">Half Day</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkMarkAbsent}
            disabled={bulkMarkAttendance.isPending}
            className="w-full sm:w-auto"
          >
            Mark All Absent
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'daily' && (
        <div className="card-elevated overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">
              Attendance for {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filteredAttendance.length} employees • {filteredAttendance.filter(a => a.status === 'present').length} present
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check In</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check Out</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remarks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                    </tr>
                  ))
                ) : employees?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No employees found. Add employees first to track attendance.
                    </td>
                  </tr>
                ) : (
                  employees?.map((employee) => {
                    const attendance = getAttendanceForEmployee(employee.id);
                    return (
                      <tr key={employee.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                              {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{employee.full_name}</p>
                              <p className="text-xs text-muted-foreground">{employee.employee_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">{employee.department || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          {attendance ? (
                            <AttendanceStatusBadge status={attendance.status} />
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Not Marked
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">{attendance?.check_in_time || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">{attendance?.check_out_time || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">{formatDuration(attendance?.work_duration)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground capitalize">{attendance?.leave_type || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">{attendance?.remarks || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleMarkAttendance(employee)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'monthly' && (
        <MonthlyAttendanceView />
      )}

      {viewMode === 'employee' && (
        <EmployeeAttendanceHistory />
      )}

      <MarkAttendanceDialog
        open={markAttendanceOpen}
        onOpenChange={setMarkAttendanceOpen}
        employee={selectedEmployeeForAttendance}
        attendanceDate={selectedDate}
        existingAttendance={selectedEmployeeForAttendance ? getAttendanceForEmployee(selectedEmployeeForAttendance.id) : null}
      />
    </div>
  );
}