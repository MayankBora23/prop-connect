import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useUpdateProfile } from '@/hooks/useProfiles';
import { useTelephonySettings } from '@/hooks/useTelephonySettings';
import { normalizeCallerDeskBridgeNumber } from '@/lib/callerdeskPhone';
import { toast } from 'sonner';
import { User, Loader2, Phone, Lock } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  agent_identity: z.string().optional().or(z.literal('')),
  callerdesk_bridge_number: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileSettingsView() {
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
  const { data: telephonySettings } = useTelephonySettings();
  const updateProfile = useUpdateProfile();
  const telephonyProvider = telephonySettings?.telephony_provider ?? 'twilio';
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      agent_identity: '',
      callerdesk_bridge_number: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        agent_identity: profile.agent_identity || '',
        callerdesk_bridge_number:
          (profile as { callerdesk_bridge_number?: string | null }).callerdesk_bridge_number || '',
      });
    }
  }, [profile, form]);

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!profile?.id) return;

    const bridgeNormalized = normalizeCallerDeskBridgeNumber(data.callerdesk_bridge_number);
    if (data.callerdesk_bridge_number?.trim() && bridgeNormalized.length !== 10) {
      toast.error('CallerDesk bridge number must be 10 digits (no country code).');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        name: data.name,
        agent_identity: data.agent_identity || null,
        callerdesk_bridge_number: bridgeNormalized || null,
      } as Parameters<typeof updateProfile.mutateAsync>[0]);
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <User className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">
            Unable to load your profile information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Update your personal information and telephony settings (Twilio and CallerDesk)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} placeholder="Enter your full name" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agent_identity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Twilio Agent Identity
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} placeholder="e.g., agent_john_doe" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Twilio only: your browser/SDK client name for voice calls (e.g.{' '}
                      <span className="font-mono">agent_jane_doe</span>). Not used when your company uses CallerDesk.
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="callerdesk_bridge_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      CallerDesk Bridge Number (Agent)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="e.g. 9876543210"
                          className="pl-10 font-mono"
                          inputMode="numeric"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      CallerDesk only: your mobile number that rings first on outbound calls (10 digits, no country
                      code). Each team member sets their own bridge number here — company admins configure the
                      integration key and virtual/IVR number in Company Settings.
                    </p>
                  </FormItem>
                )}
              />

              {telephonyProvider === 'twilio' && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Twilio voice setup:</h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Set your Twilio Agent Identity above (required when Telephony Provider is Twilio)</li>
                    <li>Ensure your company has configured Twilio Voice credentials in Company Settings</li>
                    <li>Make outbound calls to telephony-enabled leads from the Telephony dialer</li>
                    <li>Incoming Twilio calls route to your client identity in the browser</li>
                  </ol>
                  <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/40 rounded border">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Format:</strong> Start with &quot;agent_&quot; followed by your name (e.g.,{' '}
                      &quot;agent_john_smith&quot;). This identity must be unique across your company.
                    </p>
                  </div>
                </div>
              )}

              {telephonyProvider === 'callerdesk' && (
                <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-orange-900 dark:text-orange-100">CallerDesk voice setup:</h4>
                  <ol className="text-sm text-orange-800 dark:text-orange-200 space-y-1 list-decimal list-inside">
                    <li>Set your Bridge Number (Agent) above — must match your mobile in the CallerDesk member list</li>
                    <li>
                      In CallerDesk dashboard: add your number to a <strong>Call Group</strong> linked to the company
                      virtual number (if reports show &quot;Call Group: Not Assigned&quot;, Leg B will not connect)
                    </li>
                    <li>Ask your admin to set the Integration key and Virtual/IVR number in Company Settings</li>
                    <li>Answer quickly when the virtual number calls you, then stay on the line for the customer leg</li>
                  </ol>
                </div>
              )}

              <Button type="submit" disabled={updateProfile.isPending} className="w-full">
                {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your login password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="new-password"
                name="new-password"
                autoComplete="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirm-new-password"
                name="confirm-new-password"
                autoComplete="new-password"
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          <Button
            type="button"
            onClick={handleChangePassword}
            disabled={passwordLoading || !newPassword || !confirmNewPassword}
            className="w-full"
          >
            {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
