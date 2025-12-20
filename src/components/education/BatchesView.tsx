import { useBatches } from '@/hooks/useBatches';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Filter, Download } from 'lucide-react';
import { format } from 'date-fns';

export function BatchesView() {
  const { data: batches, isLoading } = useBatches();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Batches</h2>
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

      {/* Batches List */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Students</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                </tr>
              ))
            ) : (batches || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No batches found. Add your first batch to get started.
                </td>
              </tr>
            ) : (
              (batches || []).map((batch) => (
                <tr key={batch.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground text-sm">{batch.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">
                      {Array.isArray((batch as any).courses) && (batch as any).courses[0]?.name 
                        ? (batch as any).courses[0].name 
                        : (batch as any).courses?.name || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {format(new Date(batch.start_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {batch.end_date ? format(new Date(batch.end_date), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {batch.schedule || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {batch.max_students || '-'}
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

