import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneCall, Phone, Calendar } from 'lucide-react';
import type { CallAnalyticsData } from '@/hooks/useCallAnalytics';
import type { TelephonyProviderKey } from '@/hooks/useTelephony';

interface CircularProgressProps {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({ percentage, color, size = 80, strokeWidth = 8 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const dashoffset = circumference * (1 - clamped / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{clamped.toFixed(0)}%</span>
      </div>
    </div>
  );
}

interface DualCircularProgressProps {
  primaryPct: number;
  secondaryPct: number;
  primaryColor: string;
  secondaryColor: string;
  centerLabel: string;
  size?: number;
  strokeWidth?: number;
}

function DualCircularProgress({
  primaryPct,
  secondaryPct,
  primaryColor,
  secondaryColor,
  centerLabel,
  size = 88,
  strokeWidth = 7,
}: DualCircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const p = Math.min(100, Math.max(0, primaryPct));
  const s = Math.min(100 - p, Math.max(0, secondaryPct));
  const primaryOffset = circumference * (1 - p / 100);
  const secondaryOffset = circumference * (1 - (p + s) / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={primaryColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={primaryOffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={secondaryColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={secondaryOffset}
          strokeLinecap="round"
          className="transition-all duration-500"
          style={{
            opacity: s > 0 ? 1 : 0,
            transform: `rotate(${(p / 100) * 360}deg)`,
            transformOrigin: 'center',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none">{centerLabel}</span>
      </div>
    </div>
  );
}

interface CallOverviewCardsProps {
  analytics?: CallAnalyticsData;
  isLoading: boolean;
  provider: TelephonyProviderKey;
}

export function CallOverviewCards({ analytics, isLoading }: CallOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="min-w-[200px] shrink-0 lg:min-w-0">
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
    <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
      <Card className="min-w-[200px] shrink-0 lg:min-w-0 border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <PhoneCall className="h-8 w-8 text-blue-500 mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics?.today_total ?? 0}</p>
          <p className="text-sm text-muted-foreground">Today&apos;s Calls</p>
        </CardContent>
      </Card>

      <Card className="min-w-[200px] shrink-0 lg:min-w-0 border-l-4 border-l-gray-500">
        <CardContent className="p-6">
          <Phone className="h-8 w-8 text-gray-500 mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics?.yesterday_total ?? 0}</p>
          <p className="text-sm text-muted-foreground">Yesterday&apos;s Calls</p>
        </CardContent>
      </Card>

      <Card className="min-w-[200px] shrink-0 lg:min-w-0">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <DualCircularProgress
            primaryPct={analytics?.last_7_days_answered_percentage ?? 0}
            secondaryPct={analytics?.last_7_days_unanswered_percentage ?? 0}
            primaryColor="#22c55e"
            secondaryColor="#ef4444"
            centerLabel={`${(analytics?.last_7_days_answered_percentage ?? 0).toFixed(0)}%`}
          />
          <p className="text-sm font-semibold text-foreground mt-2">Last 7 Days</p>
          <p className="text-xs text-muted-foreground">
            Total: {analytics?.last_7_days_total ?? 0} calls
          </p>
        </CardContent>
      </Card>

      <Card className="min-w-[200px] shrink-0 lg:min-w-0">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <DualCircularProgress
            primaryPct={analytics?.this_month_answered_percentage ?? 0}
            secondaryPct={analytics?.this_month_missed_percentage ?? 0}
            primaryColor="#22c55e"
            secondaryColor="#f59e0b"
            centerLabel={`${(analytics?.this_month_answered_percentage ?? 0).toFixed(0)}%`}
          />
          <p className="text-sm font-semibold text-foreground mt-2">This Month</p>
          <p className="text-xs text-muted-foreground">
            Missed: {(analytics?.this_month_missed_percentage ?? 0).toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card className="min-w-[200px] shrink-0 lg:min-w-0 border-l-4 border-l-purple-500">
        <CardContent className="p-6">
          <Calendar className="h-8 w-8 text-purple-500 mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics?.last_month_total ?? 0}</p>
          <p className="text-sm text-muted-foreground">Last Month</p>
        </CardContent>
      </Card>
    </div>
  );
}
