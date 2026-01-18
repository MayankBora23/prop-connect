import { useState } from 'react';
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees';
import { LayoutGrid, List, Filter, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EditEmployeeDialog } from '../employees/EditEmployeeDialog';
import type { Employee } from '@/hooks/useEmployees';

// Helper function to format salary for display
function formatSalary(salary: number | null): string {
  if (!salary) return '-';

  if (salary >= 10000000) { // Crores
    const crores = salary / 10000000;
    return crores % 1 === 0 ? `₹${crores}Cr` : `₹${crores.toFixed(2)}Cr`;
  } else if (salary >= 100000) { // Lakhs
    const lakhs = salary / 100000;
    return lakhs % 1 === 0 ? `₹${lakhs}L` : `₹${lakhs.toFixed(2)}L`;
  } else if (salary >= 1000) { // Thousands
    const thousands = salary / 1000;
    return thousands % 1 === 0 ? `₹${thousands}K` : `₹${thousands.toFixed(2)}K`;
  }

  return `₹${salary.toLocaleString('en-IN')}`;
}

export function AutomobileEmployeesView() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('list');
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { data: employees, isLoading } = useEmployees();
  const deleteEmployee = useDeleteEmployee();

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditEmployeeOpen(true);
  };

  const handleDelete = async (employeeId: string, employeeName: string) => {
    try {
      await deleteEmployee.mutateAsync(employeeId);
      toast.success(`${employeeName} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${employeeName}`);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List View
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employment Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Joining</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))
              ) : (employees || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No employees found. Add your first employee to get started.
                  </td>
                </tr>
            ) : (
              (employees || []).map((employee) => (
                <tr key={employee.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-primary">{employee.employee_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{employee.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{employee.phone}</p>
                    <p className="text-xs text-muted-foreground">{employee.email || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{employee.role}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{employee.department || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      employee.employment_type === 'full-time' && "bg-green-100 text-green-800",
                      employee.employment_type === 'part-time' && "bg-blue-100 text-blue-800",
                      employee.employment_type === 'contract' && "bg-orange-100 text-orange-800"
                    )}>
                      {employee.employment_type === 'full-time' ? 'Full-time' :
                       employee.employment_type === 'part-time' ? 'Part-time' :
                       'Contract'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-primary">
                      {formatSalary(employee.salary)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {employee.date_of_joining ? format(new Date(employee.date_of_joining), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(employee)}
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
                            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {employee.full_name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(employee.id, employee.full_name)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditEmployeeDialog
        open={editEmployeeOpen}
        onOpenChange={setEditEmployeeOpen}
        employee={selectedEmployee}
      />
    </div>
  );
}