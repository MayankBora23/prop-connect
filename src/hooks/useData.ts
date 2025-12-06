import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAnalytics,
  fetchFollowUps,
  fetchLeads,
  fetchMessages,
  fetchProperties,
  fetchSiteVisits,
  fetchUsers,
  fetchWorkflows,
  createLead,
  createLeadsBatch,
  updateLead,
  deleteLead,
  createProperty,
  updateProperty,
  deleteProperty,
  createSiteVisit,
  updateSiteVisit,
  deleteSiteVisit,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  updateWorkflow,
  type Lead,
  type Property,
  type SiteVisit,
  type FollowUp,
  type Workflow,
} from '@/services/dataService';

export const useLeads = () =>
  useQuery({ queryKey: ['leads'], queryFn: fetchLeads, refetchOnWindowFocus: true });

export const useProperties = () =>
  useQuery({ queryKey: ['properties'], queryFn: fetchProperties, refetchOnWindowFocus: true });

export const useSiteVisits = () =>
  useQuery({ queryKey: ['siteVisits'], queryFn: fetchSiteVisits, refetchOnWindowFocus: true });

export const useFollowUps = () =>
  useQuery({ queryKey: ['followUps'], queryFn: fetchFollowUps, refetchOnWindowFocus: true });

export const useMessages = () =>
  useQuery({ queryKey: ['messages'], queryFn: fetchMessages, refetchOnWindowFocus: true });

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: fetchUsers, refetchOnWindowFocus: true });

export const useWorkflows = () =>
  useQuery({ queryKey: ['workflows'], queryFn: fetchWorkflows, refetchOnWindowFocus: true });

export const useAnalytics = () =>
  useQuery({ queryKey: ['analytics'], queryFn: fetchAnalytics, refetchOnWindowFocus: true });

// Mutations
export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useCreateLeadsBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLeadsBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useCreateProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
};

export const useUpdateProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Property> }) => updateProperty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
};

export const useDeleteProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
};

export const useCreateSiteVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSiteVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteVisits'] });
    },
  });
};

export const useUpdateSiteVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SiteVisit> }) => updateSiteVisit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteVisits'] });
    },
  });
};

export const useDeleteSiteVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSiteVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteVisits'] });
    },
  });
};

export const useCreateFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
    },
  });
};

export const useUpdateFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FollowUp> }) => updateFollowUp(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
    },
  });
};

export const useDeleteFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
    },
  });
};

export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Workflow> }) => updateWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
};

