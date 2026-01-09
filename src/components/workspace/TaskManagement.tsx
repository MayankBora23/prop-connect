import { useTasks } from '@/hooks/useTasks';
import { useUpdateFollowUp } from '@/hooks/useFollowUps';
import { cn } from '@/lib/utils';
import { Check, Clock, User, Calendar, Phone, MessageSquare, Calendar as CalendarIcon, Mail, Car, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function TaskManagement() {
  const { data: taskCategories, isLoading } = useTasks();
  const updateFollowUp = useUpdateFollowUp();
  const { toast } = useToast();

  const handleMarkComplete = async (taskId: string) => {
    try {
      await updateFollowUp.mutateAsync({ id: taskId, status: 'completed' });
      toast({
        title: 'Task Completed',
        description: 'Task has been marked as completed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete task',
        variant: 'destructive',
      });
    }
  };

  const getAssignedProfileName = (assignedTo: string | null) => {
    // For now, return a placeholder since we don't have profile data in this context
    return assignedTo ? 'Assigned' : 'Unassigned';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'follow_up': return User;
      case 'lead': return User;
      case 'site_visit': return Building2;
      case 'auto_lead': return Car;
      case 'call': return Phone;
      case 'whatsapp': return MessageSquare;
      case 'meeting': return CalendarIcon;
      case 'email': return Mail;
      default: return User;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'follow_up': return 'bg-primary/10 text-primary';
      case 'lead': return 'bg-info/10 text-info';
      case 'site_visit': return 'bg-success/10 text-success';
      case 'auto_lead': return 'bg-warning/10 text-warning';
      case 'call': return 'bg-success/10 text-success';
      case 'whatsapp': return 'bg-info/10 text-info';
      case 'meeting': return 'bg-warning/10 text-warning';
      case 'email': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-8" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-14" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, j) => (
                  <tr key={j}>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-12" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <Skeleton className="h-6 w-28 mb-4" />
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-8" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Skeleton className="h-4 w-14" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, j) => (
                  <tr key={j}>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-12" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const { assigned = [], pending = [], completed = [] } = taskCategories || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Assigned Tasks */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning" />
          Assigned Tasks ({assigned.length})
        </h3>
        {assigned.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assigned.map((task) => {
                  const TypeIcon = getTypeIcon(task.type);
                  return (
                    <tr key={task.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            getTypeColor(task.type)
                          )}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {task.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {task.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              task.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                              task.priority === 'medium' ? 'bg-warning/10 text-warning' :
                              'bg-success/10 text-success'
                            )}
                          >
                            {task.priority.toUpperCase()}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">
                          {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="text-xs bg-secondary/50"
                        >
                          {task.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleMarkComplete(task.id)}
                            disabled={updateFollowUp.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No assigned tasks</p>
        )}
      </div>

      {/* Pending Tasks */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-info" />
          Pending Tasks ({pending.length})
        </h3>
        {pending.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pending.map((task) => {
                  const TypeIcon = getTypeIcon(task.type);
                  return (
                    <tr key={task.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            getTypeColor(task.type)
                          )}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {task.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {task.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              task.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                              task.priority === 'medium' ? 'bg-warning/10 text-warning' :
                              'bg-success/10 text-success'
                            )}
                          >
                            {task.priority.toUpperCase()}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">
                          {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="text-xs bg-info/10 text-info"
                        >
                          {task.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleMarkComplete(task.id)}
                            disabled={updateFollowUp.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No pending tasks</p>
        )}
      </div>

      {/* Completed Tasks */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          Completed Tasks ({completed.length})
        </h3>
        {completed.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {completed.map((task) => {
                  const TypeIcon = getTypeIcon(task.type);
                  return (
                    <tr key={task.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            getTypeColor(task.type)
                          )}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {task.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {task.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              task.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                              task.priority === 'medium' ? 'bg-warning/10 text-warning' :
                              'bg-success/10 text-success'
                            )}
                          >
                            {task.priority.toUpperCase()}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">
                          {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="default"
                          className="text-xs bg-success/10 text-success"
                        >
                          {task.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No completed tasks yet</p>
        )}
      </div>
    </div>
  );
}
