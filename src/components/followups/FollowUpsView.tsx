import { useFollowUps, FollowUpWithLead, useUpdateFollowUp } from '@/hooks/useFollowUps';
import { Phone, MessageSquare, Calendar, Mail, Clock, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Enums } from '@/integrations/supabase/types';

type FollowUpType = Enums<'follow_up_type'>;

export function FollowUpsView() {
  const { data: followUps, isLoading } = useFollowUps();
  const updateFollowUp = useUpdateFollowUp();
  const { toast } = useToast();

  const pendingFollowUps = (followUps || []).filter(f => f.status === 'pending');
  const missedFollowUps = (followUps || []).filter(f => f.status === 'missed');
  const completedFollowUps = (followUps || []).filter(f => f.status === 'completed');

  const getTypeIcon = (type: FollowUpType) => {
    switch (type) {
      case 'call': return Phone;
      case 'whatsapp': return MessageSquare;
      case 'meeting': return Calendar;
      case 'email': return Mail;
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await updateFollowUp.mutateAsync({ id, status: 'completed' });
      toast({
        title: 'Follow-up Completed',
        description: 'Follow-up marked as completed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update follow-up',
        variant: 'destructive',
      });
    }
  };

  const FollowUpCard = ({ followUp }: { followUp: FollowUpWithLead }) => {
    const TypeIcon = getTypeIcon(followUp.type);

    return (
      <div className="card-elevated p-4 animate-scale-in">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              followUp.type === 'call' ? 'bg-success/10 text-success' :
              followUp.type === 'whatsapp' ? 'bg-info/10 text-info' :
              followUp.type === 'meeting' ? 'bg-warning/10 text-warning' :
              'bg-primary/10 text-primary'
            )}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm">{followUp.leads?.name || 'Unknown Lead'}</h4>
              <p className="text-xs text-muted-foreground capitalize">{followUp.type}</p>
            </div>
          </div>
          <span className={cn(
            'text-xs px-2 py-1 rounded-full font-medium',
            followUp.status === 'pending' ? 'bg-warning/10 text-warning' :
            followUp.status === 'completed' ? 'bg-success/10 text-success' :
            'bg-destructive/10 text-destructive'
          )}>
            {followUp.status}
          </span>
        </div>

        {followUp.notes && (
          <p className="text-sm text-muted-foreground mb-3">{followUp.notes}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(followUp.follow_up_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{followUp.follow_up_time}</span>
          </div>
        </div>

        {followUp.status === 'pending' && (
          <div className="flex items-center gap-2 mt-4">
            <Button 
              size="sm" 
              className="flex-1 gradient-primary border-0"
              onClick={() => handleMarkComplete(followUp.id)}
              disabled={updateFollowUp.isPending}
            >
              <Check className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
            <Button size="sm" variant="outline">
              Reschedule
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-warning flex items-center justify-center">
            <Clock className="w-6 h-6 text-warning-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendingFollowUps.length}</p>
            <p className="text-sm text-muted-foreground">Pending Today</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{missedFollowUps.length}</p>
            <p className="text-sm text-muted-foreground">Missed</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
            <Check className="w-6 h-6 text-success-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{completedFollowUps.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>

      {/* Missed Follow-ups (Priority) */}
      {missedFollowUps.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Missed Follow-ups
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missedFollowUps.map((followUp) => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </div>
        </div>
      )}

      {/* Pending Follow-ups */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          Today's Follow-ups
        </h3>
        {pendingFollowUps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingFollowUps.map((followUp) => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No pending follow-ups</p>
        )}
      </div>

      {/* Completed Follow-ups */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-success" />
          Completed
        </h3>
        {completedFollowUps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedFollowUps.map((followUp) => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No completed follow-ups</p>
        )}
      </div>
    </div>
  );
}
