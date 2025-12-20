import { useStudents } from '@/hooks/useStudents';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Filter, Download, Upload } from 'lucide-react';

export function StudentsView() {
  const { data: students, isLoading } = useStudents();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Students</h2>
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

      {/* Students List */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent Info</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Birth</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-40" /></td>
                </tr>
              ))
            ) : (students || []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No students found. Add your first student to get started.
                </td>
              </tr>
            ) : (
              (students || []).map((student) => (
                <tr key={student.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{student.name}</p>
                        {student.email && (
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{student.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    {student.parent_name ? (
                      <>
                        <p className="text-sm text-foreground">{student.parent_name}</p>
                        <p className="text-xs text-muted-foreground">{student.parent_phone || '-'}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">-</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {student.address || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

