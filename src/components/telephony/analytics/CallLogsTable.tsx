import React, { useState } from 'react';
import { format } from 'date-fns';
import { Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCallLogs,
  getDisplayCustomerNumber,
  formatCallDuration,
  type CallLogRow,
} from '@/hooks/useCallAnalytics';
import {
  getCallerDeskBridgeNumber,
  getCrmAgentName,
  getTwilioAgentIdentity,
} from '@/lib/telephonyAgentDisplay';
import { useProfiles } from '@/hooks/useProfiles';
import type { TelephonyProviderKey } from '@/hooks/useTelephony';

const COL_COUNT = 9;

interface CallLogsTableProps {
  provider: TelephonyProviderKey;
  filter: string;
  customFrom: Date | null;
  customTo: Date | null;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'completed':
    case 'connected':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'no_answer':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
    case 'busy':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'failed':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    case 'initiated':
    case 'ringing':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    default:
      return '';
  }
}

function providerBadge(provider: string | null) {
  if (provider === 'callerdesk') {
    return <Badge className="bg-orange-500 hover:bg-orange-500">CallerDesk</Badge>;
  }
  return <Badge className="bg-red-600 hover:bg-red-600">Twilio</Badge>;
}

function directionBadge(direction: string) {
  if (direction === 'incoming') {
    return <Badge className="bg-blue-500 hover:bg-blue-500">Inbound</Badge>;
  }
  return <Badge className="bg-green-600 hover:bg-green-600">Outbound</Badge>;
}

export function CallLogsTable({ provider, filter, customFrom, customTo }: CallLogsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: profiles } = useProfiles();
  const pageSize = 50;

  const { data, isLoading } = useCallLogs(filter, page, {
    provider,
    search,
    statusFilter: statusFilter === 'all' ? undefined : statusFilter,
    agentFilter: agentFilter === 'all' ? undefined : agentFilter,
    customFrom: customFrom ?? undefined,
    customTo: customTo ?? undefined,
    pageSize,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const profilesMap = data?.profiles_by_user_id ?? {};
  const profilesMeta = data?.profiles_meta ?? {};
  const isCallerDesk = provider === 'callerdesk';
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  const renderPlayer = (log: CallLogRow) => {
    if (expandedId !== log.id || !log.recording_url) return null;
    return (
      <TableRow>
        <TableCell colSpan={COL_COUNT} className="bg-muted/30">
          <audio controls src={log.recording_url} className="w-full max-w-md">
            <track kind="captions" />
          </audio>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by phone number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="sm:max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="no_answer">No Answer</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="initiated">Initiated</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={agentFilter}
            onValueChange={(v) => {
              setAgentFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {profiles?.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Customer Number</TableHead>
                <TableHead>CRM Agent</TableHead>
                <TableHead>{isCallerDesk ? 'Bridge Number' : 'Agent Identity'}</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: COL_COUNT }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COL_COUNT} className="text-center py-12 text-muted-foreground">
                    No {provider === 'callerdesk' ? 'CallerDesk' : 'Twilio'} call logs for this period.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                rows.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
                      </TableCell>
                      <TableCell>{providerBadge(log.provider)}</TableCell>
                      <TableCell>{directionBadge(log.direction)}</TableCell>
                      <TableCell>{getDisplayCustomerNumber(log)}</TableCell>
                      <TableCell>{getCrmAgentName(log, profilesMap)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {isCallerDesk
                          ? getCallerDeskBridgeNumber(log)
                          : getTwilioAgentIdentity(log, profilesMeta)}
                      </TableCell>
                      <TableCell>{formatCallDuration(log.duration)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusBadgeClass(log.status)}>
                          {log.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.recording_url ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setExpandedId(expandedId === log.id ? null : log.id)
                            }
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {renderPlayer(log)}
                  </React.Fragment>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `Showing ${from}–${to} of ${total} calls` : 'No calls'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={to >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
