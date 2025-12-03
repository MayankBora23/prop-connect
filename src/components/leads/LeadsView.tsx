import { useState } from 'react';
import { LeadPipeline } from './LeadPipeline';
import { mockLeads } from '@/data/mockData';
import { LayoutGrid, List, Filter, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LeadsView() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'pipeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pipeline')}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Pipeline
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
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
      {viewMode === 'pipeline' ? (
        <LeadPipeline />
      ) : (
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {lead.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.source}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{lead.phone}</p>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{lead.propertyType}</p>
                    <p className="text-xs text-muted-foreground">{lead.location}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-primary">{lead.budget}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full font-medium',
                      lead.stage === 'new' ? 'bg-info/10 text-info' :
                      lead.stage === 'contacted' ? 'bg-primary/10 text-primary' :
                      lead.stage === 'site-visit' ? 'bg-warning/10 text-warning' :
                      lead.stage === 'negotiation' ? 'bg-success/10 text-success' :
                      lead.stage === 'closed-won' ? 'bg-success/10 text-success' :
                      lead.stage === 'closed-lost' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {lead.stage.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{lead.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
