import { SiteVisit } from '@/data/mockData';
import { Calendar, Clock, User, MessageSquare, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSiteVisits } from '@/hooks/useData';

export function SiteVisitsView() {
  const { data: siteVisits = [], isLoading } = useSiteVisits();

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading site visits...</div>;
  }

  const scheduledVisits = siteVisits.filter(v => v.status === 'scheduled');
  const completedVisits = siteVisits.filter(v => v.status === 'completed');
  const cancelledVisits = siteVisits.filter(v => v.status === 'cancelled');

  const VisitCard = ({ visit }: { visit: SiteVisit }) => (
    <div className="card-elevated p-4 animate-scale-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {visit.leadName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{visit.leadName}</h4>
            <p className="text-xs text-muted-foreground">{visit.propertyTitle}</p>
          </div>
        </div>
        <span className={cn(
          'text-xs px-2 py-1 rounded-full font-medium',
          visit.status === 'scheduled' ? 'bg-info/10 text-info' :
          visit.status === 'completed' ? 'bg-success/10 text-success' :
          'bg-destructive/10 text-destructive'
        )}>
          {visit.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{visit.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{visit.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{visit.assignedTo}</span>
        </div>
      </div>

      {visit.feedback && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">{visit.feedback}</p>
        </div>
      )}

      {visit.status === 'scheduled' && (
        <div className="flex items-center gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Reminder
          </Button>
          <Button size="sm" variant="outline">
            <Check className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Scheduled Visits */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-info" />
          Scheduled Visits ({scheduledVisits.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduledVisits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      </div>

      {/* Completed Visits */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          Completed ({completedVisits.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedVisits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      </div>

      {/* Cancelled Visits */}
      {cancelledVisits.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Cancelled ({cancelledVisits.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cancelledVisits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
