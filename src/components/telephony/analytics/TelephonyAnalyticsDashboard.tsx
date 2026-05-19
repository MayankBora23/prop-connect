import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCallAnalytics, useCallLogsRealtime } from '@/hooks/useCallAnalytics';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useTelephonySettings } from '@/hooks/useTelephonySettings';
import type { TelephonyProviderKey } from '@/hooks/useTelephony';
import { TelephonyProviderConfigBanner } from '@/components/telephony/TelephonyProviderConfigBanner';
import { CallAnalyticsFilterBar } from '@/components/telephony/analytics/CallAnalyticsFilterBar';
import { CallOverviewCards } from '@/components/telephony/analytics/CallOverviewCards';
import { CallMetricsCards } from '@/components/telephony/analytics/CallMetricsCards';
import { CallChartsSection } from '@/components/telephony/analytics/CallChartsSection';
import { CallRecordingsSection } from '@/components/telephony/analytics/CallRecordingsSection';
import { AgentPerformanceTable } from '@/components/telephony/analytics/AgentPerformanceTable';
import { CallLogsTable } from '@/components/telephony/analytics/CallLogsTable';

interface TelephonyAnalyticsDashboardProps {
  provider: TelephonyProviderKey;
}

export function TelephonyAnalyticsDashboard({ provider }: TelephonyAnalyticsDashboardProps) {
  useCallLogsRealtime();
  const { data: profile } = useCurrentProfile();
  const { data: telephonySettings } = useTelephonySettings();

  const [activeFilter, setActiveFilter] = useState('thismonth');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading } = useCallAnalytics(
    activeFilter,
    provider,
    customFrom ?? undefined,
    customTo ?? undefined
  );

  const isCallerDesk = provider === 'callerdesk';

  return (
    <div key={provider} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Telephony Analytics</h2>
          <p className="text-muted-foreground text-sm">
            {isCallerDesk
              ? 'CallerDesk metrics — filtered by bridge agent number from Company Settings'
              : 'Twilio metrics — filtered by calls using Profile Agent Identity'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={
              isCallerDesk
                ? 'bg-orange-500 hover:bg-orange-500 text-white'
                : 'bg-red-600 hover:bg-red-600 text-white'
            }
          >
            {isCallerDesk ? 'CallerDesk' : 'Twilio'}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            Live
          </div>
        </div>
      </div>

      <TelephonyProviderConfigBanner
        provider={provider}
        settings={telephonySettings}
        twilioAgentIdentity={profile?.agent_identity}
        callerdeskBridgeNumber={
          (profile as { callerdesk_bridge_number?: string | null } | undefined)?.callerdesk_bridge_number
        }
        profileName={profile?.name}
      />

      <CallAnalyticsFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        customFrom={customFrom}
        customTo={customTo}
        onCustomRangeChange={(from, to) => {
          setCustomFrom(from);
          setCustomTo(to);
        }}
      />

      <CallOverviewCards analytics={analytics} isLoading={isLoading} provider={provider} />

      <CallMetricsCards
        analytics={analytics}
        isLoading={isLoading}
        onRecordingsClick={() => {
          setActiveTab('recordings');
          setTimeout(() => {
            document.getElementById('recordings-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Call Logs</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CallChartsSection analytics={analytics} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="logs">
          <CallLogsTable
            provider={provider}
            filter={activeFilter}
            customFrom={customFrom}
            customTo={customTo}
          />
        </TabsContent>

        <TabsContent value="recordings" id="recordings-section">
          <CallRecordingsSection
            provider={provider}
            filter={activeFilter}
            customFrom={customFrom}
            customTo={customTo}
          />
        </TabsContent>

        <TabsContent value="agents">
          <AgentPerformanceTable
            provider={provider}
            agentPerformance={analytics?.agent_performance || []}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
