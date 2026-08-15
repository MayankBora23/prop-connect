import React, { useState, useEffect } from 'react';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTelephony } from '@/hooks/useTelephony';
import { useIndustry } from '@/hooks/useIndustry';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Phone, Clock, Trash2, Wifi, WifiOff, BarChart2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TelephonyAnalyticsDashboard } from '@/components/telephony/analytics/TelephonyAnalyticsDashboard';
import { TelephonyProviderConfigBanner } from '@/components/telephony/TelephonyProviderConfigBanner';
import { useTelephonySettings } from '@/hooks/useTelephonySettings';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateLead } from '@/hooks/useLeads';
import { useUpdateStudent } from '@/hooks/useStudents';
import { useUpdateAutoLead } from '@/hooks/useAutoLeads';
import { useUpdateInternalLead } from '@/hooks/useInternalLeads';
import { TelephonyContact } from '@/hooks/useTelephony';
import type { Lead } from '@/hooks/useLeads';
import type { Student } from '@/hooks/useStudents';
import type { InternalLead } from '@/hooks/useInternalLeads';

export function TelephonyView() {
  const { data: profile } = useCurrentProfile();
  const { data: industry } = useIndustry();
  const { callStatus, currentLead, startCall, endCall, isDeviceReady, initializeDevice, device, telephonyProvider, isCallerDeskConfigured } = useTelephony();
  const { data: telephonySettings } = useTelephonySettings();

  console.log('TelephonyView render:', {
    companyId: profile?.company_id,
    industry,
    isDeviceReady,
    hasDevice: !!device,
    callStatus,
    userAgentIdentity: profile?.agent_identity,
    telephonyProvider,
    isCallerDeskConfigured
  });

  const updateLead = useUpdateLead();
  const updateStudent = useUpdateStudent();
  const updateAutoLead = useUpdateAutoLead();
  const updateInternalLead = useUpdateInternalLead();

  const isEducation = industry === 'education';
  const isAutomobile = industry === 'automobile_dealers';
  const isInternalCRM = industry === 'internal_crm';

  const { data: telephonyContacts, isLoading } = useQuery({
    queryKey: ['telephony-contacts', profile?.company_id, industry],
    queryFn: async () => {
      if (!profile?.company_id && !isInternalCRM) return [];

      if (isEducation) {
        // For education industry, fetch students
        const { data, error } = await (supabase as any)
          .from('students')
          .select('*')
          .eq('company_id', profile?.company_id)
          .eq('is_telephony_enabled', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Student[];
      } else if (isAutomobile) {
        // For automobile industry, fetch auto_leads
        const { data, error } = await (supabase as any)
          .from('auto_leads')
          .select('*')
          .eq('company_id', profile?.company_id)
          .eq('is_telephony_enabled', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Lead[];
      } else if (isInternalCRM) {
        // For internal CRM, fetch internal_leads (global)
        const { data, error } = await (supabase as any)
          .from('internal_leads')
          .select('*')
          .eq('is_telephony_enabled', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map((lead: any) => ({
          ...lead,
          name: lead.lead_name,
          phone: lead.phone_no
        })) as (InternalLead & { name: string, phone: string })[];
      } else {
        // For real estate industry, fetch leads
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('company_id', profile?.company_id)
          .eq('is_telephony_enabled', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Lead[];
      }
    },
    enabled: !!profile?.company_id || isInternalCRM,
  });

  const handleCall = async (contact: Lead | Student) => {
    await startCall(contact);
  };

  const handleEndCall = () => {
    void endCall();
  };

  const handleInitializeDevice = async () => {
    console.log('Manual initialize button clicked');
    console.log('Current device state:', { device: !!device, isDeviceReady });
    await initializeDevice();
    console.log('After manual initialize:', { device: !!device, isDeviceReady });
  };

  const handleRemoveFromTelephony = async (contact: Lead | Student) => {
    try {
      if (isEducation) {
        await updateStudent.mutateAsync({
          id: contact.id,
          is_telephony_enabled: false
        });
      } else if (isAutomobile) {
        await updateAutoLead.mutateAsync({
          id: contact.id,
          is_telephony_enabled: false
        });
      } else if (isInternalCRM) {
        await updateInternalLead.mutateAsync({
          id: contact.id,
          is_telephony_enabled: false
        });
      } else {
        await updateLead.mutateAsync({
          id: contact.id,
          is_telephony_enabled: false
        });
      }
      toast.success(`${contact.name} has been removed from the Telephony queue.`);
    } catch (error) {
      console.error('Error removing contact from telephony:', error);
      toast.error('Failed to remove contact from Telephony queue');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
<table className="w-full">

            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Called At</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))}
            </tbody>
          
</table>
</div>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="dialer" className="space-y-4">
      <TabsList>
        <TabsTrigger value="dialer" className="gap-2">
          <Phone className="h-4 w-4" />
          Dialer
        </TabsTrigger>
        <TabsTrigger value="analytics" className="gap-2">
          <BarChart2 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dialer" className="space-y-4 mt-4">
    <div className="space-y-4">
      <TelephonyProviderConfigBanner
        provider={telephonyProvider}
        settings={telephonySettings}
        twilioAgentIdentity={profile?.agent_identity}
        callerdeskBridgeNumber={
          (profile as { callerdesk_bridge_number?: string | null } | undefined)?.callerdesk_bridge_number
        }
        profileName={profile?.name}
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Telephony</h2>
          <p className="text-muted-foreground">Manage your telephony campaigns and calls</p>
          <p className="text-xs text-muted-foreground mt-1">
            {telephonyProvider === 'callerdesk'
              ? 'CallerDesk uses your Bridge Number (Agent) from Profile Settings.'
              : 'Twilio uses your Agent Identity from Profile Settings.'}
          </p>
        </div>
        <div className="text-right space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">
              {telephonyProvider === 'callerdesk' ? 'CallerDesk Status' : 'Device Status'}
            </p>
            <div className="flex items-center gap-2">
              {(telephonyProvider === 'callerdesk' ? isCallerDeskConfigured : isDeviceReady) ? (
                <Wifi className="w-4 h-4 text-success" />
              ) : (
                <WifiOff className="w-4 h-4 text-destructive" />
              )}
              <p className={`text-sm font-semibold ${(telephonyProvider === 'callerdesk' ? isCallerDeskConfigured : isDeviceReady) ? 'text-success' : 'text-destructive'
                }`}>
                {telephonyProvider === 'callerdesk'
                  ? (isCallerDeskConfigured
                    ? 'Ready'
                    : 'Not Ready — set CallerDesk keys in Company Settings and your Bridge Number in Profile Settings')
                  : (isDeviceReady
                    ? 'Ready'
                    : 'Not Ready — set Twilio in Company Settings, Agent Identity in Profile, then initialize')}
              </p>
              {telephonyProvider !== 'callerdesk' && !isDeviceReady && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleInitializeDevice}
                  className="ml-2"
                >
                  Initialize
                </Button>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Call Status</p>
            <p className={`text-lg font-semibold ${callStatus === 'Idle' ? 'text-muted-foreground' :
              callStatus === 'Dialing' ? 'text-warning' :
                callStatus === 'Connected' ? 'text-success' :
                  'text-destructive'
              }`}>
              {callStatus}
            </p>
          </div>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
<table className="w-full">

          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isEducation ? 'Student Name' : (isAutomobile || isInternalCRM) ? 'Lead Name' : 'Lead Name'}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Called At</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {telephonyContacts && telephonyContacts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No {isEducation ? 'students' : (isAutomobile || isInternalCRM) ? 'leads' : 'leads'} in telephony queue. Add {isEducation ? 'students' : (isAutomobile || isInternalCRM) ? 'leads' : 'leads'} to telephony from the {isEducation ? 'Students' : (isAutomobile || isInternalCRM) ? 'Leads' : 'Leads'} section.
                </td>
              </tr>
            ) : (
              telephonyContacts?.map((contact) => (
                <tr key={contact.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isEducation ? (contact as Student).stage?.replace('_', ' ') || 'Unknown' :
                            isAutomobile ? (contact as any).status || 'Unknown' :
                              isInternalCRM ? (contact as InternalLead).stage?.replace('_', ' ') || 'Unknown' :
                                (contact as Lead).source || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{contact.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {contact.last_called_at ? format(new Date(contact.last_called_at), 'MMM d, yyyy HH:mm') : 'Never'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleCall(contact)}
                        disabled={callStatus !== 'Idle'}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove from Telephony</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {contact.name} from the Telephony queue? They will no longer appear in this list.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveFromTelephony(contact)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        
</table>
</div>
      </div>

      {/* Dialer Overlay */}
      {callStatus !== 'Idle' && currentLead && (
        <DialerOverlay
          contact={currentLead}
          callStatus={callStatus}
          onEndCall={handleEndCall}
          onMute={() => console.log('Mute toggled')}
        />
      )}
    </div>
      </TabsContent>

      <TabsContent value="analytics" className="mt-4">
        <TelephonyAnalyticsDashboard key={telephonyProvider} provider={telephonyProvider} />
      </TabsContent>
    </Tabs>
  );
}

interface DialerOverlayProps {
  contact: TelephonyContact | null;
  callStatus: 'Idle' | 'Dialing' | 'Connected' | 'Disconnected';
  onEndCall: () => void;
  onMute: () => void;
}

function DialerOverlay({ contact, callStatus, onEndCall, onMute }: DialerOverlayProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (callStatus === 'Connected') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!contact) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <div className="w-16 h-16 rounded-full bg-primary-foreground flex items-center justify-center">
              <span className="text-primary font-bold text-xl">
                {((contact as any).name || (contact as any).lead_name || '').split(' ').map((n: string) => n[0]).join('')}
              </span>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-2">{(contact as any).name || (contact as any).lead_name}</h3>
          <p className="text-muted-foreground mb-4">{(contact as any).phone || (contact as any).phone_no}</p>

          <div className="mb-6">
            {callStatus === 'Dialing' && (
              <p className="text-warning font-medium">Dialing...</p>
            )}
            {callStatus === 'Connected' && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <p className="text-success font-medium">{formatDuration(callDuration)}</p>
              </div>
            )}
            {callStatus === 'Disconnected' && (
              <p className="text-destructive font-medium">Call Ended</p>
            )}
          </div>

          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              onClick={onMute}
              disabled={callStatus !== 'Connected'}
            >
              <Phone className="w-5 h-5" />
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              onClick={onEndCall}
            >
              <Phone className="w-5 h-5" />
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              {callStatus === 'Connected' ? 'Tap to end call' : 'Ending call...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}