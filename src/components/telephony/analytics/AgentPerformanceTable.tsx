import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AgentPerformanceRow } from '@/hooks/useCallAnalytics';
import type { TelephonyProviderKey } from '@/hooks/useTelephony';

interface AgentPerformanceTableProps {
  agentPerformance: AgentPerformanceRow[];
  isLoading: boolean;
  provider: TelephonyProviderKey;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export function AgentPerformanceTable({ agentPerformance, isLoading, provider }: AgentPerformanceTableProps) {
  const isCallerDesk = provider === 'callerdesk';
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!agentPerformance || agentPerformance.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-50" />
          <p>No agent performance data for this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>{isCallerDesk ? 'Bridge Number (Agent)' : 'CRM Agent'}</TableHead>
                <TableHead>{isCallerDesk ? 'CRM User(s)' : 'Agent Identity'}</TableHead>
                <TableHead>Total Calls</TableHead>
                <TableHead>Answered</TableHead>
                <TableHead>Missed</TableHead>
                <TableHead>Avg Duration</TableHead>
                <TableHead>Answered Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentPerformance.map((agent, index) => {
                const answeredRate =
                  agent.total_calls > 0 ? (agent.answered_calls / agent.total_calls) * 100 : 0;
                const primaryLabel = isCallerDesk ? agent.endpoint : agent.name;
                const secondaryLabel = isCallerDesk ? agent.name : agent.endpoint;
                const initials = primaryLabel
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .slice(0, 2)
                  .toUpperCase() || 'AG';
                return (
                  <TableRow
                    key={agent.agent_id}
                    className={cn(
                      index === 0 && 'border-l-4 border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/20'
                    )}
                  >
                    <TableCell className="font-semibold">#{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                          {initials}
                        </div>
                        <span className={isCallerDesk ? 'font-mono' : ''}>{primaryLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell className={isCallerDesk ? '' : 'font-mono text-sm'}>{secondaryLabel}</TableCell>
                    <TableCell>{agent.total_calls}</TableCell>
                    <TableCell>{agent.answered_calls}</TableCell>
                    <TableCell>{agent.missed_calls}</TableCell>
                    <TableCell>{formatDuration(agent.avg_duration_seconds)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              answeredRate >= 70
                                ? 'bg-green-500'
                                : answeredRate >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min(100, answeredRate)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums w-10 text-right">
                          {answeredRate.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
