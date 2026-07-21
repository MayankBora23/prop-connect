import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from '@/lib/getCompanyId';
import { toast } from 'sonner';

export interface CustomStep {
  step: number
  message: string
  buttons: string[]   // display labels only — payloads stay hardcoded
}

export interface AiFlowConfig {
  id: string
  company_id: string
  industry: string
  steps: CustomStep[]
}

// Fetch config for current company
export function useAiFlowConfig(industry: string | null) {
  return useQuery({
    queryKey: ['ai-flow-config', industry],
    enabled: !!industry,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AiFlowConfig | null> => {
      const companyId = await getCompanyId()
      if (!companyId || !industry) return null
      const { data, error } = await supabase
        .from('ai_flow_configs')
        .select('*')
        .eq('company_id', companyId)
        .eq('industry', industry)
        .maybeSingle()
      
      if (error) throw error
      if (!data) return null
      
      return {
        ...data,
        steps: (data.steps as any) as CustomStep[]
      } as AiFlowConfig
    },
  })
}

// Save config (upsert)
export function useSaveAiFlowConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ industry, steps }: { industry: string; steps: CustomStep[] }) => {
      const companyId = await getCompanyId()
      if (!companyId) throw new Error('No company ID found')
      
      const { data, error } = await supabase
        .from('ai_flow_configs')
        .upsert(
          { company_id: companyId, industry, steps: steps as any },
          { onConflict: 'company_id,industry' }
        )
        .select()
        .single()
        
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ai-flow-config', vars.industry] })
      toast.success('AI bot questions saved successfully')
    },
    onError: (err: any) => {
      console.error('Failed to save AI bot config:', err)
      toast.error('Failed to save AI bot questions')
    },
  })
}

// Reset to defaults (delete custom config)
export function useResetAiFlowConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (industry: string) => {
      const companyId = await getCompanyId()
      if (!companyId) throw new Error('No company ID found')
      
      const { error } = await supabase
        .from('ai_flow_configs')
        .delete()
        .eq('company_id', companyId)
        .eq('industry', industry)
        
      if (error) throw error
    },
    onSuccess: (_, industry) => {
      queryClient.invalidateQueries({ queryKey: ['ai-flow-config', industry] })
      toast.success('Reset to default questions')
    },
    onError: (err: any) => {
      console.error('Failed to reset AI bot config:', err)
      toast.error('Failed to reset to default questions')
    },
  })
}
