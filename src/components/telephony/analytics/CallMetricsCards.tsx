import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneCall, Clock, PhoneIncoming, PhoneOff, PhoneMissed, Play } from 'lucide-react';
import type { CallAnalyticsData } from '@/hooks/useCallAnalytics';

interface CallMetricsCardsProps {
  analytics?: CallAnalyticsData;
  isLoading: boolean;
  onRecordingsClick?: () => void;
}

export function CallMetricsCards({ analytics, isLoading, onRecordingsClick }: CallMetricsCardsProps) {
  const scrollToRecordings = () => {
    onRecordingsClick?.();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-8 mb-2" />
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <PhoneCall className="h-8 w-8 text-blue-500 mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics?.total_calls ?? 0}</p>
          <p className="text-sm text-muted-foreground">Total Calls</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-6">
          <Clock className="h-8 w-8 text-green-500 mb-2" />
          <p className="text-3xl font-bold text-foreground">
            {analytics?.total_duration_formatted ?? '0 min'}
          </p>
          <p className="text-sm text-muted-foreground">Talk Duration</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-600">
        <CardContent className="p-6">
          <PhoneIncoming className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics?.answered_calls ?? 0}</p>
          <p className="text-sm text-muted-foreground">Total Answered</p>
          <p className="text-xs text-muted-foreground">{analytics?.answered_percentage ?? 0}%</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-6">
          <PhoneOff className="h-8 w-8 text-orange-500 mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics?.unanswered_calls ?? 0}</p>
          <p className="text-sm text-muted-foreground">Total Unanswered</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-6">
          <PhoneMissed className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics?.missed_calls ?? 0}</p>
          <p className="text-sm text-muted-foreground">Total Missed</p>
          <p className="text-xs text-muted-foreground">(Inbound only)</p>
        </CardContent>
      </Card>

      <Card
        className="border-l-4 border-l-purple-500 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={scrollToRecordings}
        onKeyDown={(e) => e.key === 'Enter' && scrollToRecordings()}
        role="button"
        tabIndex={0}
      >
        <CardContent className="p-6">
          <Play className="h-8 w-8 text-purple-500 mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics?.recordings_available ?? 0}</p>
          <p className="text-sm text-muted-foreground">Call Recordings</p>
        </CardContent>
      </Card>
    </div>
  );
}
