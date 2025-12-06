import { FollowUp } from '@/data/mockData';
import { Phone, MessageSquare, Calendar, Mail, Clock, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFollowUps } from '@/hooks/useData';

export function FollowUpsView() {
  const { data: followUps = [], isLoading } = useFollowUps();

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading follow-ups...</div>;
  }

  const pendingFollowUps = followUps.filter(f => f.status === 'pending');
  const missedFollowUps = followUps.filter(f => f.status === 'missed');
  const completedFollowUps = followUps.filter(f => f.status === 'completed');

  const getTypeIcon = (type: FollowUp['type']) => {
    switch (type) {
      case 'call': return Phone;
      case 'whatsapp': return MessageSquare;
      case 'meeting': return Calendar;
      case 'email': return Mail;
    }
  };

  const FollowUpCard = ({ followUp }: { followUp: FollowUp }) => {
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
              <h4 className="font-semibold text-foreground text-sm">{followUp.leadName}</h4>
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

        <p className="text-sm text-muted-foreground mb-3">{followUp.notes}</p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{followUp.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{followUp.time}</span>
          </div>
        </div>

        {followUp.status === 'pending' && (
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" className="flex-1 gradient-primary border-0">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingFollowUps.map((followUp) => (
            <FollowUpCard key={followUp.id} followUp={followUp} />
          ))}
        </div>
      </div>

      {/* Completed Follow-ups */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-success" />
          Completed
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedFollowUps.map((followUp) => (
            <FollowUpCard key={followUp.id} followUp={followUp} />
          ))}
        </div>
      </div>
    </div>
  );
}
