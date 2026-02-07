import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Device } from '@twilio/voice-sdk';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProfile } from './useProfiles';
import { toast } from 'sonner';
import type { Lead } from './useLeads';

export type CallStatus = 'Idle' | 'Dialing' | 'Connected' | 'Disconnected';

interface TelephonyContextType {
  callStatus: CallStatus;
  currentLead: Lead | null;
  device: Device | null;
  isDeviceReady: boolean;
  setCallStatus: (status: CallStatus) => void;
  setCurrentLead: (lead: Lead | null) => void;
  startCall: (lead: Lead) => Promise<void>;
  endCall: () => void;
  initializeDevice: () => Promise<void>;
}

const TelephonyContext = createContext<TelephonyContextType | undefined>(undefined);

export function TelephonyProvider({ children }: { children: ReactNode }) {
  const [callStatus, setCallStatus] = useState<CallStatus>('Idle');
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const { data: profile } = useCurrentProfile();

  // Initialize Twilio device when profile is available
  // Only initialize if we have the required profile data
  useEffect(() => {
    console.log('Profile effect triggered:', {
      hasProfile: !!profile,
      hasAgentIdentity: !!profile?.agent_identity,
      hasDevice: !!device
    });

    if (profile && profile.agent_identity && !device) {
      console.log('Automatic initialization triggered');
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        initializeDevice();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (profile && !profile.agent_identity) {
      console.log('Profile loaded but no agent_identity - skipping auto init');
    }
  }, [profile]);

  const initializeDevice = async () => {
    console.log('=== STARTING DEVICE INITIALIZATION ===');
    console.log('Current state:', { device: !!device, isDeviceReady, hasProfile: !!profile });

    // If device exists and is ready, no need to re-initialize
    if (device && isDeviceReady) {
      console.log('Device already exists and is ready - skipping initialization');
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

  const startCall = async (lead: Lead) => {
    if (!device || !isDeviceReady) {
      toast.error('Telephony not configured. Please check your settings and try again.');
      return;
    }

    try {
      setCurrentLead(lead);
      setCallStatus('Dialing');

      // Make outbound call
      const connection = await device.connect({
        params: {
          To: lead.phone,
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

  const endCall = () => {
    if (device) {
      device.disconnectAll();
    }
    setCallStatus('Disconnected');
    setTimeout(() => {
      setCallStatus('Idle');
      setCurrentLead(null);
    }, 1000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up telephony device');
      if (device) {
        device.destroy();
        console.log('Device destroyed');
      }
    };
  }, [device]);

  return (
    <TelephonyContext.Provider
      value={{
        callStatus,
        currentLead,
        device,
        isDeviceReady,
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
    throw new Error('useTelephony must be used within a TelephonyProvider');
  }
  return context;
}