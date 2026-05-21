import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Device } from '@twilio/voice-sdk';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProfile } from './useProfiles';
import { useIndustry } from './useIndustry';
import { toast } from 'sonner';
import {
  telephonySettingsQueryKey,
  useTelephonySettings,
  type TelephonySettingsSnapshot,
} from './useTelephonySettings';
import { isCallerDeskUserReady } from '@/lib/telephonyReady';
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

/** `FunctionsHttpError.context` is a `fetch` Response body (JSON from the edge function). */
async function readFunctionsHttpErrorPayload(
  error: unknown
): Promise<{ error?: string; hint?: string } | null> {
  if (!(error instanceof FunctionsHttpError)) return null
  const ctx = error.context
  if (!(ctx instanceof Response)) return null
  try {
    const text = (await ctx.text()).trim()
    if (!text) return null
    try {
      return JSON.parse(text) as { error?: string; hint?: string }
    } catch {
      return { error: text }
    }
  } catch {
    return null
  }
}

export function TelephonyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [callStatus, setCallStatus] = useState<CallStatus>('Idle');
  const [currentLead, setCurrentLead] = useState<TelephonyContact | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const { data: telephonySettingsSnapshot } = useTelephonySettings();
  const { data: profile } = useCurrentProfile();
  const { data: industry } = useIndustry();
  const telephonyProvider: TelephonyProviderKey =
    telephonySettingsSnapshot?.telephony_provider ?? 'twilio';
  const profileBridge = (profile as { callerdesk_bridge_number?: string | null } | undefined)
    ?.callerdesk_bridge_number;
  const isCallerDeskConfigured = isCallerDeskUserReady(telephonySettingsSnapshot, profileBridge);

  const profileUserId = profile?.user_id ?? null;
  const companyId = profile?.company_id ?? null;
  const industryKey = industry ?? null;

  const deviceRef = useRef<Device | null>(null);
  const prevContextRef = useRef({
    profileUserId: null as string | null,
    companyId: null as string | null,
    industryKey: null as string | null,
  });

  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  // Reset device state when user, company, or industry context changes
  useEffect(() => {
    const prev = prevContextRef.current;
    const isLoggingOut = !profileUserId && (prev.profileUserId || prev.companyId);
    const isCompanyChanged = companyId !== prev.companyId;
    const isIndustryChanged = industryKey !== prev.industryKey;
    const shouldReset = isLoggingOut || isCompanyChanged || isIndustryChanged;

    if (shouldReset) {
      setCallStatus('Idle');
      setCurrentLead(null);
      setIsDeviceReady(false);

      const activeDevice = deviceRef.current;
      if (activeDevice) {
        try {
          activeDevice.destroy();
        } catch (error) {
          console.error('Error destroying device:', error);
        }
        deviceRef.current = null;
        setDevice(null);
      }
    }

    prevContextRef.current = { profileUserId, companyId, industryKey };
  }, [profileUserId, companyId, industryKey]);

  useEffect(() => {
    return () => {
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, []);

  const normalizePhone = (value?: string | null) => {
    if (!value) return '';
    // CallerDesk expects numbers without '+' and generally without spaces/symbols.
    return value.toString().trim().replace(/^\+/, '').replace(/[^\d]/g, '');
  };

  const loadTelephonySettings = async (): Promise<
    TelephonySettingsSnapshot & Record<string, unknown>
  > => {
    const companyId = profile?.company_id;
    if (!companyId) {
      return { telephony_provider: 'twilio', isCallerDeskCompanyReady: false } as TelephonySettingsSnapshot &
        Record<string, unknown>;
    }

    await queryClient.invalidateQueries({ queryKey: telephonySettingsQueryKey(companyId) });
    const snapshot = queryClient.getQueryData<TelephonySettingsSnapshot>(
      telephonySettingsQueryKey(companyId)
    );

    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.warn('Failed to load telephony settings', error);
      return (snapshot || { telephony_provider: 'twilio', isCallerDeskCompanyReady: false }) as TelephonySettingsSnapshot &
        Record<string, unknown>;
    }

    return (data || snapshot || {}) as TelephonySettingsSnapshot & Record<string, unknown>;
  };

  const initializeDevice = async () => {
    console.log('=== STARTING DEVICE INITIALIZATION ===');
    console.log('Current state:', {
      device: !!device,
      isDeviceReady,
      hasProfile: !!profile,
      companyId,
      industry: industryKey,
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
      if (telephonyProvider === 'callerdesk') {
        if (!isCallerDeskUserReady(telephonySettingsSnapshot, profileBridge)) {
          toast.error(
            'CallerDesk is not fully configured. Set Integration key and Virtual/IVR in Company Settings, and your Bridge Number (Agent) in Profile Settings.'
          );
          setCallStatus('Idle');
          setCurrentLead(null);
          return;
        }

        const customerNumber = normalizePhone(phoneNumber);

        const { data, error } = await supabase.functions.invoke('callerdesk-make-call', {
          body: { customer_number: customerNumber },
        });

        if (error) {
          let msg = error.message
          const payload = await readFunctionsHttpErrorPayload(error)
          if (payload?.error) msg = payload.error.trim()
          if (payload?.hint) msg = `${msg} — ${payload.hint}`
          console.error('CallerDesk make call error:', error, data)
          toast.error(`CallerDesk: ${msg}`)
          setCallStatus('Idle');
          setCurrentLead(null);
          return;
        }

        console.log('CallerDesk call initiated:', data);
        const hint =
          typeof data === 'object' && data && 'hint' in data
            ? String((data as { hint?: string }).hint)
            : null;
        toast.success(
          hint ||
            'Call initiated — answer your phone, then stay on the line until the customer is connected.',
          { duration: 8000 }
        );
        return;
      }

      // Default: Twilio voice SDK — uses profiles.agent_identity (Profile Settings)
      if (!profile?.agent_identity?.trim()) {
        toast.error(
          'Set your Twilio Agent Identity in Profile Settings before calling. CallerDesk uses your Bridge Number (Agent) from Profile Settings instead.'
        );
        setCallStatus('Idle');
        setCurrentLead(null);
        return;
      }

      if (!device || !isDeviceReady) {
        toast.error('Twilio telephony not ready. Configure Twilio Voice in Company Settings and initialize the device.');
        setCallStatus('Idle');
        setCurrentLead(null);
        return;
      }

      const connection = await device.connect({
        params: {
          To: phoneNumber,
          agent_identity: profile.agent_identity.trim(),
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