import React from 'react';
import { Phone, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TelephonyProviderKey } from '@/hooks/useTelephony';
import type { TelephonySettingsSnapshot } from '@/hooks/useTelephonySettings';
import { isCallerDeskUserReady } from '@/lib/telephonyReady';

interface TelephonyProviderConfigBannerProps {
  provider: TelephonyProviderKey;
  settings?: TelephonySettingsSnapshot | null;
  twilioAgentIdentity?: string | null;
  callerdeskBridgeNumber?: string | null;
  profileName?: string | null;
}

export function TelephonyProviderConfigBanner({
  provider,
  settings,
  twilioAgentIdentity,
  callerdeskBridgeNumber,
  profileName,
}: TelephonyProviderConfigBannerProps) {
  const isCallerDesk = provider === 'callerdesk';

  if (isCallerDesk) {
    const bridge = callerdeskBridgeNumber?.trim() || null;
    const virtual = settings?.callerdesk_virtual_number;
    const ready = isCallerDeskUserReady(settings, bridge);

    return (
      <Card className="border-l-4 border-l-orange-500 bg-orange-50/40 dark:bg-orange-950/20">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-orange-600" />
              <p className="text-sm font-semibold text-foreground">CallerDesk agent (bridge)</p>
              <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-xs">Profile Settings</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Outbound calls ring <strong>your</strong> Bridge Number (Agent) from Profile Settings
              {profileName ? ` (${profileName})` : ''}, then connect the customer. Company admins set the
              integration key and virtual/IVR number.
            </p>
            <div className="flex flex-wrap gap-4 text-sm pt-1">
              <span>
                Bridge number:{' '}
                <span className="font-mono font-medium text-foreground">{bridge || '— not set —'}</span>
              </span>
              {virtual && (
                <span>
                  Virtual/IVR: <span className="font-mono font-medium text-foreground">{virtual}</span>
                </span>
              )}
            </div>
          </div>
          <Badge variant={ready ? 'default' : 'destructive'} className={ready ? 'bg-green-600' : ''}>
            {ready ? 'Configured' : 'Incomplete setup'}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const identity = twilioAgentIdentity?.trim();
  const ready = !!identity;

  return (
    <Card className="border-l-4 border-l-red-600 bg-red-50/40 dark:bg-red-950/20">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-foreground">Twilio agent identity</p>
            <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs">Profile Settings</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Browser calls use <strong>Twilio Agent Identity</strong> from your profile
            {profileName ? ` (${profileName})` : ''}. CallerDesk bridge number is not used for Twilio.
          </p>
          <p className="text-sm pt-1">
            Identity:{' '}
            <span className="font-mono font-medium text-foreground">{identity || '— not set —'}</span>
          </p>
        </div>
        <Badge variant={ready ? 'default' : 'destructive'} className={ready ? 'bg-green-600' : ''}>
          {ready ? 'Ready' : 'Set identity in Profile'}
        </Badge>
      </CardContent>
    </Card>
  );
}
