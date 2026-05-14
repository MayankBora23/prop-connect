export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketCategory =
  | 'bug'
  | 'feature_request'
  | 'help'
  | 'integration'
  | 'billing'
  | 'other';

export type MessageSenderType = 'client' | 'admin';

export interface SupportTicket {
  id: string;
  company_id: string;
  created_by: string;
  assigned_to: string | null;
  industry_type: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  tags: string[];
  ticket_number: number;
  is_read_by_admin: boolean;
  is_read_by_client: boolean;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  creator_email?: string;
  creator_user_id?: string;
  creator_role?: string;
  assignee_name?: string;
  company_name?: string;
  /** Contact email from companies row (billing / main company email). */
  company_contact_email?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  company_id: string;
  sender_id: string;
  sender_type: MessageSenderType;
  message: string;
  is_internal: boolean;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}

export interface SupportAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  company_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TicketStats {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
  unread_by_admin: number;
}

export interface NewTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  tags: string[];
}

export interface SupportTicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  /** When set, filters tickets by client company name (internal CRM list). */
  company?: string;
}
