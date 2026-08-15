import { useBatches, useDeleteBatch, useUpdateBatch } from '@/hooks/useBatches';
import { useTeachers } from '@/hooks/useTeachers';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Filter, Download, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { EditBatchDialog } from './EditBatchDialog';
import type { Batch } from '@/hooks/useBatches';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';

function AssignInstructorSelect({ batchId, instructorId }: { batchId: string, instructorId?: string }) {
  const { data: teachers, isLoading } = useTeachers();
  const updateBatch = useUpdateBatch();

  return (
    <Select
      value={instructorId ?? 'unassigned'}
      onValueChange={value => {
        updateBatch.mutate({ id: batchId, instructor_id: value === 'unassigned' ? null : value });
      }}
      disabled={isLoading || updateBatch.isPending}
    >
      <SelectTrigger className="h-7 w-40 text-xs bg-background">
        <SelectValue placeholder="Assign instructor..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {(teachers || []).map(teacher => (
          <SelectItem key={teacher.id} value={teacher.id}>
            {teacher.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BatchRow({ batch, onEdit }: { batch: any; onEdit: (batch: Batch) => void }) {
  const deleteBatch = useDeleteBatch();

  const handleDelete = async () => {
    try {
      await deleteBatch.mutateAsync(batch.id);
      toast.success(`${batch.name} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${batch.name}`);
    }
  };

  const handleEdit = () => {
    onEdit(batch);
  };

  return (
    <tr className="hover:bg-secondary/50 transition-colors">
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
      <td className="px-4 py-3">
        <AssignInstructorSelect batchId={batch.id} instructorId={batch.instructor_id} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Batch</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{batch.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    </tr>
  );
}

export function BatchesView() {
  const { data: batches, isLoading } = useBatches();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const { search } = useSectionSearch();

  const filteredBatches = useMemo(
    () =>
      filterBySearch(batches, search, (batch) => [
        batch.name,
        batch.schedule,
        batch.courses?.name,
        batch.teachers?.name,
      ]),
    [batches, search]
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Batches</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Batches List */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
<table className="w-full">

          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Students</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instructor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
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
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))
            ) : filteredBatches.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {search.trim() ? 'No batches match your search.' : 'No batches found. Add your first batch to get started.'}
                </td>
              </tr>
            ) : (
              filteredBatches.map((batch) => (
                <BatchRow
                  key={batch.id}
                  batch={batch}
                  onEdit={(batch) => {
                    setSelectedBatch(batch);
                    setEditDialogOpen(true);
                  }}
                />
              ))
            )}
          </tbody>
        
</table>
</div>
      </div>

      <EditBatchDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        batch={selectedBatch}
      />
    </div>
  );
}

