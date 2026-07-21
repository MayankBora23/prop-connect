import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from '@/lib/getCompanyId';
import { toast } from 'sonner';

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface WhatsAppTemplate {
  id: string;
  company_id: string;
  template_name: string;
  meta_template_id?: string | null;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paused';
  body_text: string;
  variables: string[];
  header_type: 'none' | 'text' | 'image' | 'document' | 'video';
  header_text?: string | null;
  header_media_url?: string | null;
  footer_text?: string | null;
  buttons: TemplateButton[];
  example_values?: Record<string, string> | null;
  variable_labels?: Record<string, string> | null;
  rejection_reason?: string | null;
  is_library_template?: boolean;
  industry?: string | null;
  created_by?: string | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

async function invokeTemplateManager(payload: { action: string; company_id: string; [key: string]: unknown }) {
  const { data, error } = await supabase.functions.invoke('whatsapp-template-manager', {
    body: payload
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useWhatsAppTemplates(statusFilter?: string) {
  return useQuery({
    queryKey: ['whatsapp-templates', statusFilter],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const companyId = await getCompanyId();
      if (!companyId) return [] as WhatsAppTemplate[];

      let query = supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('company_id', companyId);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WhatsAppTemplate[];
    }
  });
}

export function useApprovedTemplates() {
  return useQuery({
    queryKey: ['whatsapp-templates', 'approved'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const companyId = await getCompanyId();
      if (!companyId) return [] as WhatsAppTemplate[];

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as WhatsAppTemplate[];
    }
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company ID not found');

      const templateName = template.template_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert({
          ...template,
          company_id: companyId,
          template_name: templateName,
          buttons: template.buttons as unknown as import('@/integrations/supabase/types').Json
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as WhatsAppTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template draft saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save template draft');
    }
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WhatsAppTemplate> & { id: string }) => {
      if (updates.template_name) {
        updates.template_name = updates.template_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      }

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update({
          ...updates,
          ...(updates.buttons !== undefined && { buttons: updates.buttons as unknown as import('@/integrations/supabase/types').Json })
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as WhatsAppTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update template');
    }
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, template_name }: { id: string; template_name: string }) => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company ID not found');

      await invokeTemplateManager({
        action: 'delete',
        company_id: companyId,
        template_id: id,
        template_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete template');
    }
  });
}

export function useSubmitTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company ID not found');

      const data = await invokeTemplateManager({
        action: 'submit',
        company_id: companyId,
        template_id: templateId
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template submitted to Meta successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit template');
    }
  });
}

export function useSyncTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company ID not found');

      const data = await invokeTemplateManager({
        action: 'sync',
        company_id: companyId
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success(`Synced ${data?.synced_count ?? 0} templates from Meta`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync templates');
    }
  });
}

export function useSendTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      templateId,
      variableValues
    }: {
      conversationId: string;
      templateId: string;
      variableValues: Record<string, string>;
    }) => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company ID not found');

      const data = await invokeTemplateManager({
        action: 'send_template',
        company_id: companyId,
        conversation_id: conversationId,
        template_id: templateId,
        variable_values: variableValues
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Template sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send template');
    }
  });
}

export function useCloneTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const rawName = template.template_name + '_copy';
      const templateName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert({
          company_id: template.company_id,
          template_name: templateName,
          category: template.category,
          language: template.language,
          status: 'draft',
          body_text: template.body_text,
          variables: template.variables,
          header_type: template.header_type,
          header_text: template.header_text,
          header_media_url: template.header_media_url,
          footer_text: template.footer_text,
          buttons: template.buttons as unknown as import('@/integrations/supabase/types').Json,
          is_library_template: false,
          industry: template.industry
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as WhatsAppTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template cloned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone template');
    }
  });
}
