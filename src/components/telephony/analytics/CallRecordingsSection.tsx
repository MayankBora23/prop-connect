import React, { useState } from 'react';
import { format } from 'date-fns';
import { Mic, Play, Download } from 'lucide-react';
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
} from '@/hooks/useCallAnalytics';
import {
  getCallerDeskBridgeNumber,
  getCrmAgentName,
  getTwilioAgentIdentity,
} from '@/lib/telephonyAgentDisplay';
import { useProfiles } from '@/hooks/useProfiles';
import type { TelephonyProviderKey } from '@/hooks/useTelephony';

const COL_COUNT = 8;

interface CallRecordingsSectionProps {
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
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

export function CallRecordingsSection({
  provider,
  filter,
  customFrom,
  customTo,
}: CallRecordingsSectionProps) {
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: profiles } = useProfiles();
  const pageSize = 20;

  const { data, isLoading } = useCallLogs(filter, page, {
    provider,
    search,
    agentFilter: agentFilter === 'all' ? undefined : agentFilter,
    customFrom: customFrom ?? undefined,
    customTo: customTo ?? undefined,
    recordingsOnly: true,
    pageSize,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const profilesMap = data?.profiles_by_user_id ?? {};
  const profilesMeta = data?.profiles_meta ?? {};
  const isCallerDesk = provider === 'callerdesk';
  const from = total > 0 ? page * pageSize + 1 : 0;
  const to = Math.min((page + 1) * pageSize, total);

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search customer number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="sm:max-w-xs"
          />
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
                Array.from({ length: 4 }).map((_, i) => (
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
                  <TableCell colSpan={COL_COUNT} className="text-center py-16">
                    <Mic className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      No {provider === 'callerdesk' ? 'CallerDesk' : 'Twilio'} recordings available
                    </p>
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
                      <TableCell>
                        {log.direction === 'incoming' ? (
                          <Badge className="bg-blue-500 hover:bg-blue-500">Inbound</Badge>
                        ) : (
                          <Badge className="bg-green-600 hover:bg-green-600">Outbound</Badge>
                        )}
                      </TableCell>
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
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setExpandedId(expandedId === log.id ? null : log.id)
                            }
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                          {log.recording_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(log.recording_url!)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === log.id && log.recording_url && (
                      <TableRow>
                        <TableCell colSpan={COL_COUNT} className="bg-muted/30">
                          <audio controls src={log.recording_url} className="w-full max-w-lg">
                            <track kind="captions" />
                          </audio>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
            </TableBody>
          </Table>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {from}–{to} of {total} recordings
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
        )}
      </CardContent>
    </Card>
  );
}
