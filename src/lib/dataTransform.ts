// Transform data between Supabase (snake_case) and Frontend (camelCase)

import type { Lead, Property, SiteVisit, FollowUp, Message, User, Workflow, LeadStage } from '@/data/mockData';

// Supabase row types (snake_case)
type SupabaseLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  budget: string | null;
  location: string | null;
  property_type: string | null;
  source: string | null;
  stage: string | null;
  assigned_to: string | null;
  tags: string[] | null;
  notes: string[] | null;
  created_at: string | null;
  last_contact: string | null;
};

type SupabaseProperty = {
  id: string;
  title: string;
  location: string | null;
  bhk: string | null;
  area: string | null;
  price: string | null;
  description: string | null;
  status: string | null;
  images: string[] | null;
  created_at: string | null;
};

type SupabaseSiteVisit = {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  property_id: string | null;
  property_title: string | null;
  date: string | null;
  time: string | null;
  assigned_to: string | null;
  status: string | null;
  feedback: string | null;
};

type SupabaseFollowUp = {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  type: string | null;
  date: string | null;
  time: string | null;
  notes: string | null;
  status: string | null;
};

type SupabaseMessage = {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  phone: string | null;
  content: string | null;
  timestamp: string | null;
  direction: string | null;
  status: string | null;
  type: string | null;
  meta_message_id: string | null;
  meta_status: string | null;
  meta_error: string | null;
};

type SupabaseUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  avatar: string | null;
  leads_assigned: number | null;
  deals_closed: number | null;
};

type SupabaseWorkflow = {
  id: string;
  name: string | null;
  trigger: string | null;
  action: string | null;
  status: string | null;
  last_run: string | null;
  runs_count: number | null;
};

// Transform Supabase -> Frontend
export function transformLead(row: SupabaseLead): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    budget: row.budget || '',
    location: row.location || '',
    propertyType: row.property_type || '',
    source: row.source || '',
    stage: (row.stage as LeadStage) || 'new',
    assignedTo: row.assigned_to || '',
    tags: row.tags || [],
    notes: row.notes || [],
    createdAt: row.created_at || new Date().toISOString().split('T')[0],
    lastContact: row.last_contact || row.created_at || new Date().toISOString().split('T')[0],
  };
}

export function transformProperty(row: SupabaseProperty): Property {
  return {
    id: row.id,
    title: row.title,
    location: row.location || '',
    bhk: row.bhk || '',
    area: row.area || '',
    price: row.price || '',
    description: row.description || '',
    status: (row.status as Property['status']) || 'available',
    images: row.images || [],
    createdAt: row.created_at || new Date().toISOString().split('T')[0],
  };
}

export function transformSiteVisit(row: SupabaseSiteVisit): SiteVisit {
  return {
    id: row.id,
    leadId: row.lead_id || '',
    leadName: row.lead_name || '',
    propertyId: row.property_id || '',
    propertyTitle: row.property_title || '',
    date: row.date || '',
    time: row.time || '',
    assignedTo: row.assigned_to || '',
    status: (row.status as SiteVisit['status']) || 'scheduled',
    feedback: row.feedback || undefined,
  };
}

export function transformFollowUp(row: SupabaseFollowUp): FollowUp {
  return {
    id: row.id,
    leadId: row.lead_id || '',
    leadName: row.lead_name || '',
    type: (row.type as FollowUp['type']) || 'call',
    date: row.date || '',
    time: row.time || '',
    notes: row.notes || '',
    status: (row.status as FollowUp['status']) || 'pending',
  };
}

export function transformMessage(row: SupabaseMessage): Message {
  return {
    id: row.id,
    leadId: row.lead_id || '',
    leadName: row.lead_name || '',
    phone: row.phone || '',
    content: row.content || '',
    timestamp: row.timestamp || new Date().toISOString(),
    direction: (row.direction as Message['direction']) || 'incoming',
    status: (row.status as Message['status']) || 'sent',
    type: (row.type as Message['type']) || 'text',
  };
}

export function transformUser(row: SupabaseUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    role: (row.role as User['role']) || 'agent',
    avatar: row.avatar || '/placeholder.svg',
    leadsAssigned: row.leads_assigned || 0,
    dealsClosed: row.deals_closed || 0,
  };
}

export function transformWorkflow(row: SupabaseWorkflow): Workflow {
  return {
    id: row.id,
    name: row.name || '',
    trigger: row.trigger || '',
    action: row.action || '',
    status: (row.status as Workflow['status']) || 'inactive',
    lastRun: row.last_run || undefined,
    runsCount: row.runs_count || 0,
  };
}

// Transform Frontend -> Supabase (for mutations)
export function transformLeadToSupabase(lead: Partial<Lead>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (lead.name !== undefined) result.name = lead.name;
  if (lead.phone !== undefined) result.phone = lead.phone;
  if (lead.email !== undefined) result.email = lead.email;
  if (lead.budget !== undefined) result.budget = lead.budget;
  if (lead.location !== undefined) result.location = lead.location;
  if (lead.propertyType !== undefined) result.property_type = lead.propertyType;
  if (lead.source !== undefined) result.source = lead.source;
  if (lead.stage !== undefined) result.stage = lead.stage;
  if (lead.assignedTo !== undefined) result.assigned_to = lead.assignedTo;
  if (lead.tags !== undefined) result.tags = lead.tags;
  if (lead.notes !== undefined) result.notes = lead.notes;
  if (lead.createdAt !== undefined) result.created_at = lead.createdAt;
  if (lead.lastContact !== undefined) result.last_contact = lead.lastContact;
  return result;
}

export function transformPropertyToSupabase(property: Partial<Property>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (property.title !== undefined) result.title = property.title;
  if (property.location !== undefined) result.location = property.location;
  if (property.bhk !== undefined) result.bhk = property.bhk;
  if (property.area !== undefined) result.area = property.area;
  if (property.price !== undefined) result.price = property.price;
  if (property.description !== undefined) result.description = property.description;
  if (property.status !== undefined) result.status = property.status;
  if (property.images !== undefined) result.images = property.images;
  if (property.createdAt !== undefined) result.created_at = property.createdAt;
  return result;
}

export function transformSiteVisitToSupabase(visit: Partial<SiteVisit>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (visit.leadId !== undefined) result.lead_id = visit.leadId;
  if (visit.leadName !== undefined) result.lead_name = visit.leadName;
  if (visit.propertyId !== undefined) result.property_id = visit.propertyId;
  if (visit.propertyTitle !== undefined) result.property_title = visit.propertyTitle;
  if (visit.date !== undefined) result.date = visit.date;
  if (visit.time !== undefined) result.time = visit.time;
  if (visit.assignedTo !== undefined) result.assigned_to = visit.assignedTo;
  if (visit.status !== undefined) result.status = visit.status;
  if (visit.feedback !== undefined) result.feedback = visit.feedback;
  return result;
}

export function transformFollowUpToSupabase(followUp: Partial<FollowUp>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (followUp.leadId !== undefined) result.lead_id = followUp.leadId;
  if (followUp.leadName !== undefined) result.lead_name = followUp.leadName;
  if (followUp.type !== undefined) result.type = followUp.type;
  if (followUp.date !== undefined) result.date = followUp.date;
  if (followUp.time !== undefined) result.time = followUp.time;
  if (followUp.notes !== undefined) result.notes = followUp.notes;
  if (followUp.status !== undefined) result.status = followUp.status;
  return result;
}

export function transformWorkflowToSupabase(workflow: Partial<Workflow>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (workflow.name !== undefined) result.name = workflow.name;
  if (workflow.trigger !== undefined) result.trigger = workflow.trigger;
  if (workflow.action !== undefined) result.action = workflow.action;
  if (workflow.status !== undefined) result.status = workflow.status;
  if (workflow.lastRun !== undefined) result.last_run = workflow.lastRun;
  if (workflow.runsCount !== undefined) result.runs_count = workflow.runsCount;
  return result;
}

