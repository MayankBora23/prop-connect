import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Device } from '@twilio/voice-sdk';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProfile } from './useProfiles';
import { useIndustry } from './useIndustry';
import { toast } from 'sonner';
import type { Lead } from './useLeads';
import type { Student } from './useStudents';
import type { InternalLead } from './useInternalLeads';

export type CallStatus = 'Idle' | 'Dialing' | 'Connected' | 'Disconnected';

export type TelephonyContact = Lead | Student | InternalLead;

export type TelephonyProviderKey = 'twilio' | 'callerdesk';

interface TelephonyContextType {
  callStatus: CallStatus;
  currentLead: TelephonyContact | null;
  device: Device | null;
  isDeviceReady: boolean;
  telephonyProvider: TelephonyProviderKey;
  isCallerDeskConfigured: boolean;
  setCallStatus: (status: CallStatus) => void;
  setCurrentLead: (lead: TelephonyContact | null) => void;
  startCall: (contact: TelephonyContact) => Promise<void>;
  endCall: () => Promise<void>;
  initializeDevice: () => Promise<void>;
}

const TelephonyContext = createContext<TelephonyContextType | undefined>(undefined);

export function TelephonyProvider({ children }: { children: ReactNode }) {
  const [callStatus, setCallStatus] = useState<CallStatus>('Idle');
  const [currentLead, setCurrentLead] = useState<TelephonyContact | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [telephonyProvider, setTelephonyProvider] = useState<TelephonyProviderKey>('twilio');
  const [isCallerDeskConfigured, setIsCallerDeskConfigured] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [currentIndustry, setCurrentIndustry] = useState<string | null>(null);
  const { data: profile } = useCurrentProfile();
  const { data: industry } = useIndustry();

  // Create a unique key for company+industry combination
  const contextKey = `${profile?.company_id || 'no-company'}-${industry || 'no-industry'}`;

  // Reset device state when company+industry context changes or user logs out/in
  useEffect(() => {
    const isLoggingOut = !profile && (currentCompanyId || currentIndustry);
    const isCompanyChanged = profile?.company_id !== currentCompanyId;
    const isIndustryChanged = industry !== currentIndustry;
    const shouldReset = isLoggingOut || isCompanyChanged || isIndustryChanged;

    console.log('Device state check:', {
      contextKey,
      isLoggingOut,
      isCompanyChanged,
      isIndustryChanged,
      shouldReset,
      hasProfile: !!profile,
      hasIndustry: !!industry,
      currentCompanyId,
      currentIndustry,
      isDeviceReady,
      hasDevice: !!device
    });

    if (shouldReset) {
      console.log('Resetting device state due to logout/company/industry change');

      // Reset all device-related state
      setCallStatus('Idle');
      setCurrentLead(null);
      setIsDeviceReady(false);

      // Update current context
      setCurrentCompanyId(profile?.company_id || null);
      setCurrentIndustry(industry || null);

      // Destroy device if it exists
      if (device) {
        try {
          console.log('Destroying device due to context change');
          device.destroy();
          console.log('Device destroyed successfully');
        } catch (error) {
          console.error('Error destroying device:', error);
        }
        setDevice(null);
      }

      console.log('Device state fully reset for context:', contextKey);
    }
  }, [profile, industry, device, currentCompanyId, currentIndustry]);

  // Cleanup effect to destroy device when component unmounts
  useEffect(() => {
    return () => {
      console.log('TelephonyProvider unmounting, destroying device');
      if (device) {
        device.destroy();
      }
    };
  }, [device]);

  const normalizePhone = (value?: string | null) => {
    if (!value) return '';
    // CallerDesk expects numbers without '+' and generally without spaces/symbols.
    return value.toString().trim().replace(/^\+/, '').replace(/[^\d]/g, '');
  };

  const loadTelephonySettings = async () => {
    // Use select('*') to avoid hard-failing (400) if migrations haven't been applied yet
    // or PostgREST schema cache hasn't refreshed for newly added columns.
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .single();

    // If settings row doesn't exist yet, treat as Twilio (existing behavior).
    if (error && (error as any).code !== 'PGRST116') {
      console.warn('Failed to load telephony settings', error);
      setTelephonyProvider('twilio');
      setIsCallerDeskConfigured(false);
      return {} as any;
    }

    const provider: TelephonyProviderKey =
      (data as any)?.telephony_provider === 'callerdesk' ? 'callerdesk' : 'twilio';
    setTelephonyProvider(provider);

    const integrationKey = ((data as any)?.callerdesk_integration_key || '').toString().trim();
    const bridgeNumberRaw = ((data as any)?.callerdesk_bridge_number || '').toString().trim();
    setIsCallerDeskConfigured(!!integrationKey && !!bridgeNumberRaw);

    return (data || {}) as any;
  };

  useEffect(() => {
    // Keep provider/config in sync for the current company context
    // (ignore errors; UI will fall back to Twilio behavior)
    loadTelephonySettings().catch((e) => console.warn('Failed to load telephony settings', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.company_id]);

  useEffect(() => {
    // Realtime sync: when Company Settings saves telephony_provider/CallerDesk keys,
    // switch Telephony UI immediately without requiring a refresh.
    const companyId = profile?.company_id;
    if (!companyId) return;

    const channel = supabase
      .channel(`telephony-settings-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_settings',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          loadTelephonySettings().catch((e) =>
            console.warn('Failed to refresh telephony settings from realtime', e)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.company_id]);

  const initializeDevice = async () => {
    console.log('=== STARTING DEVICE INITIALIZATION ===');
    console.log('Current state:', {
      device: !!device,
      isDeviceReady,
      hasProfile: !!profile,
      companyId: profile?.company_id,
      industry: industry,
      currentCompanyId,
      currentIndustry
    });

    // Ensure we use the provider selected in settings (source of truth)
    try {
      await loadTelephonySettings();
    } catch (e) {
      console.warn('Failed to refresh telephony settings before init', e);
    }

    // If device exists and is ready, no need to re-initialize
    if (device && isDeviceReady) {
      console.log('Device already exists and is ready - skipping initialization');
      return;
    }

    // CallerDesk does not use Twilio device initialization
    if (telephonyProvider === 'callerdesk') {
      toast.message('CallerDesk does not require device initialization.');
      return;
    }

    // If device exists but isn't ready, destroy it first
    if (device && !isDeviceReady) {
      console.log('Device exists but not ready - destroying and re-initializing');
      device.destroy();
      setDevice(null);
      setIsDeviceReady(false);
    }

    console.log('Starting device initialization...');
    try {
      // Get access token from our Edge Function
      const { data: tokenData, error } = await supabase.functions.invoke('get-voice-token');

      if (error) {
        console.error('=== ERROR GETTING VOICE TOKEN ===');
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));

        // Check if it's a configuration error (missing credentials)
        if (error.message?.includes('Missing Twilio credentials') ||
          error.message?.includes('WhatsApp/Twilio settings not configured')) {
          console.log('Configuration error detected');
          toast.error('Telephony not configured. Please ask your admin to set up Twilio Voice credentials in Company Settings.');
          setIsDeviceReady(false);
          return;
        }

        // Check if it's a profile error (missing agent identity)
        if (error.message?.includes('Agent identity not configured')) {
          console.log('Agent identity error detected');
          toast.error('Agent identity not set. Please configure your agent identity in Profile Settings.');
          setIsDeviceReady(false);
          return;
        }

        console.log('Unknown error type');
        toast.error('Failed to initialize telephony: ' + error.message);
        return;
      }

      console.log('Token response received:', { hasToken: !!tokenData?.token, identity: tokenData?.identity });

      if (!tokenData?.token) {
        console.error('No token received in response');
        console.error('Full response:', tokenData);
        toast.error('Failed to get telephony access token');
        return;
      }

      console.log('Token received successfully, proceeding with device creation...');

      console.log('Creating Twilio device with token length:', tokenData.token.length);

      // Create Twilio device
      const twilioDevice = new Device(tokenData.token, {
        logLevel: 'debug'
      });

      console.log('Twilio device created successfully');

      // Set up event listeners
      console.log('Setting up device event listeners...');

      twilioDevice.on('ready', () => {
        console.log('🎉 Twilio device ready event fired');
        setIsDeviceReady(true);
        toast.success('Telephony ready');
      });

      twilioDevice.on('error', (error) => {
        console.error('❌ Twilio device error:', error);
        toast.error('Telephony error: ' + error.message);
        setIsDeviceReady(false);
      });

      twilioDevice.on('registered', () => {
        console.log('📞 Twilio device registered event fired');
      });

      twilioDevice.on('unregistered', () => {
        console.log('📴 Twilio device unregistered');
        setIsDeviceReady(false);
      });

      twilioDevice.on('connecting', () => {
        console.log('🔗 Twilio device connecting...');
      });

      twilioDevice.on('disconnect', () => {
        console.log('🔌 Twilio device disconnected');
      });

      console.log('Event listeners set up');

      twilioDevice.on('connect', (connection) => {
        console.log('Call connected');
        setCallStatus('Connected');
        toast.success('Call connected');
      });

      twilioDevice.on('disconnect', () => {
        console.log('Call disconnected');
        setCallStatus('Disconnected');
        setTimeout(() => {
          setCallStatus('Idle');
          setCurrentLead(null);
        }, 1000);
      });

      twilioDevice.on('incoming', (connection) => {
        console.log('Incoming call received');
        // For now, auto-accept incoming calls
        connection.accept();
        setCallStatus('Connected');
      });

      // Register the device with timeout
      console.log('Registering Twilio device...');
      try {
        const registrationPromise = twilioDevice.register();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Registration timeout after 10 seconds')), 10000)
        );

        await Promise.race([registrationPromise, timeoutPromise]);
        console.log('✅ Twilio device registered successfully');

        setDevice(twilioDevice);

        // Set as ready immediately after successful registration
        // The 'ready' event will confirm this, but we can start with ready state
        setIsDeviceReady(true);
        console.log('✅ Device set to ready state');

        toast.success('Telephony device initialized successfully');

      } catch (registerError) {
        console.error('❌ Failed to register Twilio device:', registerError);
        console.error('Registration error details:', JSON.stringify(registerError, null, 2));
        toast.error('Failed to register telephony device: ' + registerError.message);
        setIsDeviceReady(false);
        return;
      }

    } catch (error) {
      console.error('Error initializing Twilio device:', error);
      toast.error('Failed to initialize telephony');
    }
  };

  const startCall = async (contact: TelephonyContact) => {
    try {
      setCurrentLead(contact);
      setCallStatus('Dialing');

      const phoneNumber = (contact as any).phone || (contact as any).phone_no;
      const providerSettings = await loadTelephonySettings();
      const provider = ((providerSettings as any)?.telephony_provider || telephonyProvider) as string;

      if (provider === 'callerdesk') {
        const integrationKey = (providerSettings?.callerdesk_integration_key || '').toString().trim();
        const bridgeNumberRaw = (providerSettings?.callerdesk_bridge_number || '').toString().trim();

        if (!integrationKey || !bridgeNumberRaw) {
          toast.error('CallerDesk telephony is not configured. Please set Integration Key and Bridge Number in Company Settings.');
          setCallStatus('Idle');
          setCurrentLead(null);
          return;
        }

        const customerNumber = normalizePhone(phoneNumber);

        const { data, error } = await supabase.functions.invoke('callerdesk-make-call', {
          body: { customer_number: customerNumber },
        });

        if (error) {
          console.error('CallerDesk make call error:', error);
          toast.error(`Failed to trigger CallerDesk call: ${error.message}`);
          setCallStatus('Idle');
          setCurrentLead(null);
          return;
        }

        console.log('CallerDesk call initiated:', data);
        toast.success('Call initiated');
        return;
      }

      // Default: Twilio voice SDK (existing behavior)
      if (!device || !isDeviceReady) {
        toast.error('Telephony not configured. Please ensure Twilio settings are configured and your agent identity is set.');
        setCallStatus('Idle');
        setCurrentLead(null);
        return;
      }

      const connection = await device.connect({
        params: {
          To: phoneNumber,
          agent_identity: profile?.agent_identity || 'unknown_agent'
        }
      });

      console.log('Call initiated:', connection);

    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      setCallStatus('Idle');
      setCurrentLead(null);
    }
  };

  const endCall = async () => {
    // End-call behavior is provider-specific.
    // - Twilio: disconnect active SDK connection(s)
    // - CallerDesk: we can't programmatically hang up reliably from client, so we just close the UI state.
    let provider: TelephonyProviderKey = telephonyProvider;
    try {
      const latest = await loadTelephonySettings();
      provider = (latest as any)?.telephony_provider === 'callerdesk' ? 'callerdesk' : 'twilio';
    } catch (e) {
      console.warn('Failed to refresh telephony settings before endCall', e);
    }

    if (provider !== 'callerdesk' && device) {
      device.disconnectAll();
    }
    setCallStatus('Disconnected');
    setTimeout(() => {
      setCallStatus('Idle');
      setCurrentLead(null);
    }, 1000);
  };


  return (
    <TelephonyContext.Provider
      value={{
        callStatus,
        currentLead,
        device,
        isDeviceReady,
        telephonyProvider,
        isCallerDeskConfigured,
        setCallStatus,
        setCurrentLead,
        startCall,
        endCall,
        initializeDevice,
      }}
    >
      {children}
    </TelephonyContext.Provider>
  );
}

export function useTelephony() {
  const context = useContext(TelephonyContext);
  if (context === undefined) {
    // During hot reloads / transient unmounts, React can render a child before
    // the provider is re-established. Don't crash the entire app; return a safe stub.
    return {
      callStatus: 'Idle' as const,
      currentLead: null,
      device: null,
      isDeviceReady: false,
      telephonyProvider: 'twilio' as const,
      isCallerDeskConfigured: false,
      setCallStatus: () => {},
      setCurrentLead: () => {},
      startCall: async () => {},
      endCall: async () => {},
      initializeDevice: async () => {},
    };
  }
  return context;
}