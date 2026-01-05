import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useUpdateCompany } from '@/hooks/useCompany';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useWhatsAppSettings, useCreateWhatsAppSettings, useUpdateWhatsAppSettings } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';
import { Building2, Mail, Phone, MapPin, Image, Loader2, ShieldAlert, MessageSquare, Settings } from 'lucide-react';

const companySchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  zip_code: z.string().max(20).optional().or(z.literal('')),
});

const whatsappSchema = z.object({
  twilio_sid: z.string().min(1, 'Twilio SID is required'),
  twilio_auth_token: z.string().min(1, 'Twilio Auth Token is required'),
  whatsapp_number: z.string().min(1, 'WhatsApp number is required'),
});

type CompanyFormData = z.infer<typeof companySchema>;
type WhatsAppFormData = z.infer<typeof whatsappSchema>;

export function CompanySettingsView() {
  const { data: company, isLoading: companyLoading } = useCurrentCompany();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
  const updateCompany = useUpdateCompany();

  // WhatsApp settings
  const { data: whatsappSettings, isLoading: whatsappLoading } = useWhatsAppSettings();
  const createWhatsAppSettings = useCreateWhatsAppSettings();
  const updateWhatsAppSettings = useUpdateWhatsAppSettings();
  
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
    },
  });

  const whatsappForm = useForm<WhatsAppFormData>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      twilio_sid: '',
      twilio_auth_token: '',
      whatsapp_number: '',
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        company_name: company.company_name || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        zip_code: company.zip_code || '',
      });
    }
  }, [company, form]);

  useEffect(() => {
    if (whatsappSettings) {
      whatsappForm.reset({
        twilio_sid: whatsappSettings.twilio_sid || '',
        twilio_auth_token: whatsappSettings.twilio_auth_token || '',
        whatsapp_number: whatsappSettings.whatsapp_number || '',
      });
    }
  }, [whatsappSettings, whatsappForm]);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isLoading = companyLoading || profileLoading || whatsappLoading;

  const onSubmit = async (data: CompanyFormData) => {
    if (!company?.id) return;

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        company_name: data.company_name,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
      });
      toast.success('Company settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update company settings');
    }
  };

  const onWhatsAppSubmit = async (data: WhatsAppFormData) => {
    if (!company?.id) return;

    try {
      if (whatsappSettings) {
        await updateWhatsAppSettings.mutateAsync({
          id: whatsappSettings.id,
          twilio_sid: data.twilio_sid,
          twilio_auth_token: data.twilio_auth_token,
          whatsapp_number: data.whatsapp_number,
        });
      } else {
        await createWhatsAppSettings.mutateAsync({
          company_id: company.id,
          twilio_sid: data.twilio_sid,
          twilio_auth_token: data.twilio_auth_token,
          whatsapp_number: data.whatsapp_number,
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save WhatsApp settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only Super Admins can access company settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Company Found</h2>
          <p className="text-muted-foreground">
            You are not associated with any company.
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
            <Building2 className="w-5 h-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Update your company's details and branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} placeholder="Enter company name" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} placeholder="+91 98765 43210" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea {...field} placeholder="Enter company address" className="pl-10 min-h-[80px]" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter ZIP code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateCompany.isPending} className="w-full">
                {updateCompany.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* WhatsApp Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            WhatsApp Business Integration
          </CardTitle>
          <CardDescription>
            Configure Twilio WhatsApp Business API for customer communication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...whatsappForm}>
            <form onSubmit={whatsappForm.handleSubmit(onWhatsAppSubmit)} className="space-y-6">
              <FormField
                control={whatsappForm.control}
                name="twilio_sid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twilio Account SID</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="pl-10 font-mono text-sm" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={whatsappForm.control}
                name="twilio_auth_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twilio Auth Token</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="Your Twilio Auth Token"
                          className="pl-10 font-mono text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={whatsappForm.control}
                name="whatsapp_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Business Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} placeholder="+1234567890" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted p-4 rounded-lg space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Setup Instructions:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Get your Twilio Account SID and Auth Token from your Twilio Console</li>
                    <li>Purchase a WhatsApp Business number or use the Twilio Sandbox</li>
                    <li>Deploy the Edge Function to Supabase (see APPLY_WHATSAPP_MIGRATION.md)</li>
                    <li>Use the webhook URL below in Twilio Console → WhatsApp → Senders</li>
                    <li>Test by sending a WhatsApp message to your business number</li>
                  </ol>
                </div>

                {whatsappSettings && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Webhook URL for Twilio:</h4>
                    <div className="bg-background p-3 rounded border font-mono text-sm break-all">
                      https://your-project.supabase.co/functions/v1/whatsapp-webhook
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Replace <code>your-project</code> with your actual Supabase project URL.<br/>
                      <strong>⚠️ DO NOT use the cloudflared tunnel URL here!</strong><br/>
                      Twilio webhooks must point to Supabase, not your local tunnel.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={createWhatsAppSettings.isPending || updateWhatsAppSettings.isPending}
                className="w-full"
              >
                {(createWhatsAppSettings.isPending || updateWhatsAppSettings.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {whatsappSettings ? 'Update WhatsApp Settings' : 'Save WhatsApp Settings'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
