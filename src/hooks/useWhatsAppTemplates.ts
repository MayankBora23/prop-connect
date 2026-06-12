import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paused';
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type HeaderType = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE';

export interface WhatsAppTemplate {
  id: string;
  company_id: string;
  template_name: string;
  meta_template_id: string | null;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  content: string;
  variables: string[] | null;
  header_type: HeaderType;
  header_text: string | null;
  header_media_url: string | null;
  footer_text: string | null;
  buttons: any[] | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates', {
        method: 'GET',
      });
      if (error) {
        console.error('Error fetching templates:', error);
        throw error;
      }
      return data as WhatsAppTemplate[];
    },
  });
}

export function useTemplateDetail(id: string) {
  return useQuery({
    queryKey: ['whatsapp-template', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.functions.invoke(`whatsapp-templates/${id}`, {
        method: 'GET',
      });
      if (error) throw error;
      return data as WhatsAppTemplate;
    },
    enabled: !!id,
  });
}

export function useTemplateAnalytics() {
  return useQuery({
    queryKey: ['whatsapp-template-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates/status', {
        method: 'GET',
      });
      if (error) throw error;
      return data as {
        stats: {
          total: number;
          approved: number;
          pending: number;
          rejected: number;
          draft: number;
          paused: number;
        };
        analytics: {
          mostUsed: Array<{
            name: string;
            category: string;
            sentCount: number;
            deliveredRate: string;
            readRate: string;
          }>;
          campaignUsage: Array<{
            campaignName: string;
            templateName: string;
            date: string;
            sentCount: number;
          }>;
        };
      };
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: {
      templateName: string;
      category: TemplateCategory;
      language: string;
      content: string;
      headerType: HeaderType;
      headerText?: string;
      headerMediaUrl?: string;
      footerText?: string;
      buttons?: any[];
    }) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates', {
        method: 'POST',
        body: template,
      });
      if (error) throw error;
      return data as WhatsAppTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-analytics'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      templateName?: string;
      category?: TemplateCategory;
      language?: string;
      content?: string;
      headerType?: HeaderType;
      headerText?: string;
      headerMediaUrl?: string;
      footerText?: string;
      buttons?: any[];
    }) => {
      const { data, error } = await supabase.functions.invoke(`whatsapp-templates/${id}`, {
        method: 'PUT',
        body: updates,
      });
      if (error) throw error;
      return data as WhatsAppTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template', data.id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-analytics'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(`whatsapp-templates/${id}`, {
        method: 'DELETE',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-analytics'] });
    },
  });
}

export function useSubmitTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates/submit', {
        method: 'POST',
        body: { templateId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, templateId) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-analytics'] });
    },
  });
}

export function useSyncTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates/sync', {
        method: 'POST',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-analytics'] });
    },
  });
}

export function useCloneTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, newName }: { templateId: string; newName: string }) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates/clone', {
        method: 'POST',
        body: { templateId, newName },
      });
      if (error) throw error;
      return data as WhatsAppTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-analytics'] });
    },
  });
}
