// Database types matching Supabase schema

export type AppRole = 'admin' | 'manager' | 'agent' | 'telecaller';
export type LeadStage = 'new' | 'contacted' | 'follow-up' | 'site-visit' | 'negotiation' | 'closed-won' | 'closed-lost';
export type PropertyStatus = 'available' | 'sold' | 'upcoming';
export type SiteVisitStatus = 'scheduled' | 'completed' | 'cancelled';
export type FollowUpType = 'call' | 'whatsapp' | 'meeting' | 'email';
export type FollowUpStatus = 'pending' | 'completed' | 'missed';
export type MessageDirection = 'incoming' | 'outgoing';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'document';
export type WorkflowStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Property {
  id: string;
  title: string;
  location: string;
  bhk: string;
  area: string;
  price: string;
  description: string | null;
  status: PropertyStatus;
  images: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  budget: string | null;
  location: string | null;
  property_type: string | null;
  source: string | null;
  stage: LeadStage;
  assigned_to: string | null;
  tags: string[];
  notes: string[];
  created_by: string | null;
  created_at: string;
  last_contact: string;
  updated_at: string;
  // Joined data
  assigned_profile?: Profile;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  property_id: string;
  visit_date: string;
  visit_time: string;
  assigned_to: string | null;
  status: SiteVisitStatus;
  feedback: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lead?: Lead;
  property?: Property;
  assigned_profile?: Profile;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  type: FollowUpType;
  follow_up_date: string;
  follow_up_time: string;
  notes: string | null;
  status: FollowUpStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lead?: Lead;
}

export interface Message {
  id: string;
  lead_id: string;
  content: string;
  direction: MessageDirection;
  status: MessageStatus;
  message_type: MessageType;
  created_at: string;
  // Joined data
  lead?: Lead;
}

export interface Workflow {
  id: string;
  name: string;
  trigger_event: string;
  action: string;
  status: WorkflowStatus;
  last_run: string | null;
  runs_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember extends Profile {
  role: AppRole;
  leads_count: number;
  deals_count: number;
}
