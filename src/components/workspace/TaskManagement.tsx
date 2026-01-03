import { useTasks } from '@/hooks/useTasks';
import { useUpdateFollowUp } from '@/hooks/useFollowUps';
import { cn } from '@/lib/utils';
import { Check, Clock, User, Calendar, Phone, MessageSquare, Calendar as CalendarIcon, Mail, Car, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  const TaskCard = ({ task }: { task: any }) => {
    const TypeIcon = getTypeIcon(task.type);

    const getPriorityColor = (priority?: string) => {
      switch (priority) {
        case 'high': return 'bg-destructive/10 text-destructive';
        case 'medium': return 'bg-warning/10 text-warning';
        case 'low': return 'bg-success/10 text-success';
        default: return 'bg-muted/10 text-muted-foreground';
      }
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return 'No due date';
      return format(new Date(dateString), 'MMM d, yyyy');
    };

    return (
      <div className="card-elevated p-4 animate-scale-in mb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              getTypeColor(task.type)
            )}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm truncate">
                {task.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {task.type.replace('_', ' ').toUpperCase()}
                </Badge>
                {task.priority && (
                  <Badge
                    variant="outline"
                    className={cn('text-xs', getPriorityColor(task.priority))}
                  >
                    {task.priority.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Badge
            variant={task.status === 'completed' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {task.status}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>

        {task.dueDate && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Due: {formatDate(task.dueDate)}</span>
            </div>
          </div>
        )}

        {task.status === 'assigned' && task.type === 'follow_up' && (
          <Button
            size="sm"
            className="w-full gradient-primary border-0"
            onClick={() => handleMarkComplete(task.id)}
            disabled={updateFollowUp.isPending}
          >
            <Check className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)] animate-fade-in">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, j) => (
                <Skeleton key={j} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { assigned = [], pending = [], completed = [] } = taskCategories || {};

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">My Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Manage your assigned tasks and track progress
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
        {/* Assigned Tasks */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-warning flex items-center justify-center">
              <User className="w-3 h-3 text-warning-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">
              Assigned ({assigned.length})
            </h3>
          </div>
          <ScrollArea className="flex-1">
            {assigned.length > 0 ? (
              assigned.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No assigned tasks</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Pending Tasks */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-info flex items-center justify-center">
              <Clock className="w-3 h-3 text-info-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">
              Pending ({pending.length})
            </h3>
          </div>
          <ScrollArea className="flex-1">
            {pending.length > 0 ? (
              pending.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending tasks</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Completed Tasks */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
              <Check className="w-3 h-3 text-success-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">
              Completed ({completed.length})
            </h3>
          </div>
          <ScrollArea className="flex-1">
            {completed.length > 0 ? (
              completed.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No completed tasks yet</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
