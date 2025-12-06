import {
  analyticsData,
  mockFollowUps,
  mockLeads,
  mockMessages,
  mockProperties,
  mockSiteVisits,
  mockUsers,
  mockWorkflows,
  type FollowUp,
  type Lead,
  type Message,
  type Property,
  type SiteVisit,
  type User,
  type Workflow,
} from '@/data/mockData';
import { supabase } from '@/lib/supabaseClient';
import {
  transformLead,
  transformProperty,
  transformSiteVisit,
  transformFollowUp,
  transformMessage,
  transformUser,
  transformWorkflow,
  transformLeadToSupabase,
  transformPropertyToSupabase,
  transformSiteVisitToSupabase,
  transformFollowUpToSupabase,
  transformWorkflowToSupabase,
} from '@/lib/dataTransform';

type Analytics = typeof analyticsData;
const apiBase = import.meta.env.VITE_API_URL as string | undefined;

async function fetchFromApi<T>(endpoint: string): Promise<T> {
  if (!apiBase) {
    throw new Error('API base url not configured');
  }
  const res = await fetch(`${apiBase.replace(/\/$/, '')}/${endpoint}`);
  if (!res.ok) {
    throw new Error(`API ${endpoint} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

function isEmptyValue<T>(data: T) {
  // Empty arrays are valid results (means no data in Supabase, not an error)
  // Only treat null/undefined or empty objects as empty
  return (
    data === null ||
    data === undefined ||
    (typeof data === 'object' && !Array.isArray(data) && Object.keys(data as object).length === 0)
  );
}

async function selectAllLeads(): Promise<Lead[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformLead);
}

async function selectAllProperties(): Promise<Property[]> {
  if (!supabase) {
    console.warn('Supabase not configured for properties - check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return [];
  }
  try {
    console.log('Fetching properties from Supabase...');
    const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase properties query error:', error);
      throw error;
    }
    // Return empty array if no data - this is valid, not an error
    if (!data || data.length === 0) {
      console.log('No properties found in Supabase (table is empty)');
      return [];
    }
    const transformed = (data || []).map(transformProperty);
    console.log(`✅ Successfully loaded ${transformed.length} properties from Supabase`);
    return transformed;
  } catch (err) {
    console.error('❌ Error fetching properties from Supabase:', err);
    throw err;
  }
}

async function selectAllSiteVisits(): Promise<SiteVisit[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('site_visits').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformSiteVisit);
}

async function selectAllFollowUps(): Promise<FollowUp[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('follow_ups').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformFollowUp);
}

async function selectAllMessages(): Promise<Message[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('messages').select('*').order('timestamp', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformMessage);
}

async function selectAllUsers(): Promise<User[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return (data || []).map(transformUser);
}

async function selectAllWorkflows(): Promise<Workflow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('workflows').select('*');
  if (error) throw error;
  return (data || []).map(transformWorkflow);
}

async function selectSingle<T>(table: string): Promise<T | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select('*').single();
  if (error) throw error;
  return data as T;
}

async function withSources<T>(sources: Array<() => Promise<T>>, fallback: T): Promise<T> {
  for (const source of sources) {
    try {
      const data = await source();
      // For arrays, always return them (even if empty) - empty array means no data in Supabase, which is valid
      // This ensures Supabase data is used even when the table is empty
      if (Array.isArray(data)) {
        return data;
      }
      // For non-arrays, check if they're actually empty
      if (!isEmptyValue(data)) {
        return data;
      }
    } catch (err) {
      console.warn('Data source failed, trying next fallback:', err);
    }
  }
  return fallback;
}

// Fetch functions
export const fetchLeads = () =>
  withSources<Lead[]>(
    [
      () => selectAllLeads(),
      () => fetchFromApi<Lead[]>('leads'),
    ],
    mockLeads
  );

export const fetchProperties = () =>
  withSources<Property[]>(
    [
      () => selectAllProperties(),
      () => fetchFromApi<Property[]>('properties'),
    ],
    mockProperties
  );

export const fetchSiteVisits = () =>
  withSources<SiteVisit[]>(
    [
      () => selectAllSiteVisits(),
      () => fetchFromApi<SiteVisit[]>('site-visits'),
    ],
    mockSiteVisits
  );

export const fetchFollowUps = () =>
  withSources<FollowUp[]>(
    [
      () => selectAllFollowUps(),
      () => fetchFromApi<FollowUp[]>('follow-ups'),
    ],
    mockFollowUps
  );

export const fetchMessages = () =>
  withSources<Message[]>(
    [
      () => selectAllMessages(),
      () => fetchFromApi<Message[]>('messages'),
    ],
    mockMessages
  );

export const fetchUsers = () =>
  withSources<User[]>(
    [
      () => selectAllUsers(),
      () => fetchFromApi<User[]>('users'),
    ],
    mockUsers
  );

export const fetchWorkflows = () =>
  withSources<Workflow[]>(
    [
      () => selectAllWorkflows(),
      () => fetchFromApi<Workflow[]>('workflows'),
    ],
    mockWorkflows
  );

export const fetchAnalytics = () =>
  withSources<Analytics>(
    [
      () => selectSingle<Analytics>('analytics'),
      () => fetchFromApi<Analytics>('analytics'),
    ],
    analyticsData
  );

// Mutation functions
export async function createLead(lead: Partial<Lead>): Promise<Lead> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = transformLeadToSupabase(lead);
  const { data: result, error } = await supabase.from('leads').insert(data).select().single();
  if (error) throw error;
  return transformLead(result);
}

export async function createLeadsBatch(leads: Partial<Lead>[]): Promise<Lead[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = leads.map(transformLeadToSupabase);
  const { data: result, error } = await supabase.from('leads').insert(data).select();
  if (error) throw error;
  return (result || []).map(transformLead);
}

export async function updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = transformLeadToSupabase(lead);
  const { data: result, error } = await supabase.from('leads').update(data).eq('id', id).select().single();
  if (error) throw error;
  return transformLead(result);
}

export async function deleteLead(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

export async function createProperty(property: Partial<Property>): Promise<Property> {
  if (!supabase) {
    console.error('Supabase not configured for creating property');
    throw new Error('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  }
  try {
    const data = transformPropertyToSupabase(property);
    console.log('Creating property in Supabase:', data);
    const { data: result, error } = await supabase.from('properties').insert(data).select().single();
    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(`Failed to create property: ${error.message}`);
    }
    console.log('Property created successfully:', result);
    return transformProperty(result);
  } catch (err) {
    console.error('Error creating property:', err);
    throw err;
  }
}

export async function updateProperty(id: string, property: Partial<Property>): Promise<Property> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = transformPropertyToSupabase(property);
  const { data: result, error } = await supabase.from('properties').update(data).eq('id', id).select().single();
  if (error) throw error;
  return transformProperty(result);
}

export async function deleteProperty(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

export async function createSiteVisit(visit: Partial<SiteVisit>): Promise<SiteVisit> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = transformSiteVisitToSupabase(visit);
  const { data: result, error } = await supabase.from('site_visits').insert(data).select().single();
  if (error) throw error;
  return transformSiteVisit(result);
}

export async function updateSiteVisit(id: string, visit: Partial<SiteVisit>): Promise<SiteVisit> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = transformSiteVisitToSupabase(visit);
  const { data: result, error } = await supabase.from('site_visits').update(data).eq('id', id).select().single();
  if (error) throw error;
  return transformSiteVisit(result);
}

export async function deleteSiteVisit(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('site_visits').delete().eq('id', id);
  if (error) throw error;
}

export async function createFollowUp(followUp: Partial<FollowUp>): Promise<FollowUp> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = transformFollowUpToSupabase(followUp);
  const { data: result, error } = await supabase.from('follow_ups').insert(data).select().single();
  if (error) throw error;
  return transformFollowUp(result);
}

export async function updateFollowUp(id: string, followUp: Partial<FollowUp>): Promise<FollowUp> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = transformFollowUpToSupabase(followUp);
  const { data: result, error } = await supabase.from('follow_ups').update(data).eq('id', id).select().single();
  if (error) throw error;
  return transformFollowUp(result);
}

export async function deleteFollowUp(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('follow_ups').delete().eq('id', id);
  if (error) throw error;
}

export async function updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
  if (!supabase) throw new Error('Supabase not configured');
  const data = transformWorkflowToSupabase(workflow);
  const { data: result, error } = await supabase.from('workflows').update(data).eq('id', id).select().single();
  if (error) throw error;
  return transformWorkflow(result);
}

