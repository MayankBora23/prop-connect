// Mock Data for Real Estate CRM

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  budget: string;
  location: string;
  propertyType: string;
  source: string;
  stage: LeadStage;
  assignedTo: string;
  tags: string[];
  notes: string[];
  createdAt: string;
  lastContact: string;
}

export type LeadStage = 'new' | 'contacted' | 'follow-up' | 'site-visit' | 'negotiation' | 'closed-won' | 'closed-lost';

export interface Property {
  id: string;
  title: string;
  location: string;
  bhk: string;
  area: string;
  price: string;
  description: string;
  status: 'available' | 'sold' | 'upcoming';
  images: string[];
  createdAt: string;
}

export interface SiteVisit {
  id: string;
  leadId: string;
  leadName: string;
  propertyId: string;
  propertyTitle: string;
  date: string;
  time: string;
  assignedTo: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback?: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  type: 'call' | 'whatsapp' | 'meeting' | 'email';
  date: string;
  time: string;
  notes: string;
  status: 'pending' | 'completed' | 'missed';
}

export interface Message {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  content: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'document';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'agent' | 'telecaller';
  avatar: string;
  leadsAssigned: number;
  dealsClosed: number;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: 'active' | 'inactive';
  lastRun?: string;
  runsCount: number;
}

// Mock Leads Data
export const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@email.com',
    budget: '₹50L - ₹75L',
    location: 'Whitefield, Bangalore',
    propertyType: '3 BHK',
    source: 'Facebook Ads',
    stage: 'new',
    assignedTo: 'Priya Sharma',
    tags: ['Hot Lead', 'Investor'],
    notes: ['Interested in east-facing property', 'Prefers gated community'],
    createdAt: '2024-01-15',
    lastContact: '2024-01-15',
  },
  {
    id: '2',
    name: 'Anita Desai',
    phone: '+91 87654 32109',
    email: 'anita.desai@email.com',
    budget: '₹30L - ₹45L',
    location: 'Electronic City, Bangalore',
    propertyType: '2 BHK',
    source: 'Website',
    stage: 'contacted',
    assignedTo: 'Vikram Singh',
    tags: ['First-time Buyer'],
    notes: ['Looking for ready-to-move property'],
    createdAt: '2024-01-14',
    lastContact: '2024-01-16',
  },
  {
    id: '3',
    name: 'Mohammed Farid',
    phone: '+91 76543 21098',
    email: 'mohammed.farid@email.com',
    budget: '₹1Cr - ₹1.5Cr',
    location: 'Koramangala, Bangalore',
    propertyType: '4 BHK',
    source: 'Referral',
    stage: 'site-visit',
    assignedTo: 'Priya Sharma',
    tags: ['Premium', 'Hot Lead'],
    notes: ['Visited 2 properties', 'Interested in luxury amenities'],
    createdAt: '2024-01-10',
    lastContact: '2024-01-18',
  },
  {
    id: '4',
    name: 'Sneha Patel',
    phone: '+91 65432 10987',
    email: 'sneha.patel@email.com',
    budget: '₹40L - ₹55L',
    location: 'HSR Layout, Bangalore',
    propertyType: '2 BHK',
    source: '99acres',
    stage: 'negotiation',
    assignedTo: 'Amit Kumar',
    tags: ['Ready to Buy'],
    notes: ['Negotiating on Sunrise Heights Unit 405'],
    createdAt: '2024-01-05',
    lastContact: '2024-01-19',
  },
  {
    id: '5',
    name: 'Karthik Reddy',
    phone: '+91 54321 09876',
    email: 'karthik.reddy@email.com',
    budget: '₹75L - ₹90L',
    location: 'Marathahalli, Bangalore',
    propertyType: '3 BHK',
    source: 'MagicBricks',
    stage: 'follow-up',
    assignedTo: 'Vikram Singh',
    tags: ['NRI'],
    notes: ['Currently in US, planning to invest'],
    createdAt: '2024-01-12',
    lastContact: '2024-01-17',
  },
  {
    id: '6',
    name: 'Lakshmi Iyer',
    phone: '+91 43210 98765',
    email: 'lakshmi.iyer@email.com',
    budget: '₹60L - ₹80L',
    location: 'Jayanagar, Bangalore',
    propertyType: '3 BHK',
    source: 'Walk-in',
    stage: 'closed-won',
    assignedTo: 'Priya Sharma',
    tags: ['Closed'],
    notes: ['Purchased Unit 302 at Green Valley'],
    createdAt: '2024-01-01',
    lastContact: '2024-01-20',
  },
];

// Mock Properties Data
export const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Sunrise Heights',
    location: 'Whitefield, Bangalore',
    bhk: '2/3 BHK',
    area: '1200-1800 sq.ft',
    price: '₹45L - ₹75L',
    description: 'Premium apartments with world-class amenities including swimming pool, gym, and clubhouse.',
    status: 'available',
    images: ['/placeholder.svg'],
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    title: 'Green Valley Residency',
    location: 'Electronic City, Bangalore',
    bhk: '2/3/4 BHK',
    area: '1100-2200 sq.ft',
    price: '₹38L - ₹95L',
    description: 'Eco-friendly living with 70% open space, organic garden, and EV charging stations.',
    status: 'available',
    images: ['/placeholder.svg'],
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    title: 'Royal Orchid Villas',
    location: 'Sarjapur Road, Bangalore',
    bhk: '4 BHK Villa',
    area: '3500-4500 sq.ft',
    price: '₹1.8Cr - ₹2.5Cr',
    description: 'Luxury villas with private garden, home theater, and smart home automation.',
    status: 'upcoming',
    images: ['/placeholder.svg'],
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    title: 'Metro Plaza Commercial',
    location: 'MG Road, Bangalore',
    bhk: 'Office Space',
    area: '500-5000 sq.ft',
    price: '₹80L - ₹4Cr',
    description: 'Grade A commercial space with excellent connectivity and modern infrastructure.',
    status: 'available',
    images: ['/placeholder.svg'],
    createdAt: '2024-01-08',
  },
  {
    id: '5',
    title: 'Lake View Apartments',
    location: 'Bellandur, Bangalore',
    bhk: '3 BHK',
    area: '1650-1850 sq.ft',
    price: '₹72L - ₹85L',
    description: 'Serene lake-facing apartments with premium finishes and 24/7 security.',
    status: 'sold',
    images: ['/placeholder.svg'],
    createdAt: '2023-12-15',
  },
];

// Mock Site Visits
export const mockSiteVisits: SiteVisit[] = [
  {
    id: '1',
    leadId: '3',
    leadName: 'Mohammed Farid',
    propertyId: '1',
    propertyTitle: 'Sunrise Heights',
    date: '2024-01-22',
    time: '10:00 AM',
    assignedTo: 'Priya Sharma',
    status: 'scheduled',
  },
  {
    id: '2',
    leadId: '5',
    leadName: 'Karthik Reddy',
    propertyId: '2',
    propertyTitle: 'Green Valley Residency',
    date: '2024-01-23',
    time: '2:00 PM',
    assignedTo: 'Vikram Singh',
    status: 'scheduled',
  },
  {
    id: '3',
    leadId: '6',
    leadName: 'Lakshmi Iyer',
    propertyId: '2',
    propertyTitle: 'Green Valley Residency',
    date: '2024-01-18',
    time: '11:00 AM',
    assignedTo: 'Priya Sharma',
    status: 'completed',
    feedback: 'Very interested, asked for payment plan details.',
  },
  {
    id: '4',
    leadId: '1',
    leadName: 'Rajesh Kumar',
    propertyId: '1',
    propertyTitle: 'Sunrise Heights',
    date: '2024-01-24',
    time: '4:00 PM',
    assignedTo: 'Priya Sharma',
    status: 'scheduled',
  },
];

// Mock Follow-ups
export const mockFollowUps: FollowUp[] = [
  {
    id: '1',
    leadId: '1',
    leadName: 'Rajesh Kumar',
    type: 'call',
    date: '2024-01-21',
    time: '10:00 AM',
    notes: 'Discuss property options and budget',
    status: 'pending',
  },
  {
    id: '2',
    leadId: '2',
    leadName: 'Anita Desai',
    type: 'whatsapp',
    date: '2024-01-21',
    time: '2:00 PM',
    notes: 'Send brochure for Electronic City projects',
    status: 'pending',
  },
  {
    id: '3',
    leadId: '4',
    leadName: 'Sneha Patel',
    type: 'meeting',
    date: '2024-01-22',
    time: '11:00 AM',
    notes: 'Final negotiation meeting at office',
    status: 'pending',
  },
  {
    id: '4',
    leadId: '5',
    leadName: 'Karthik Reddy',
    type: 'call',
    date: '2024-01-20',
    time: '9:00 PM',
    notes: 'International call - discuss investment options',
    status: 'missed',
  },
  {
    id: '5',
    leadId: '3',
    leadName: 'Mohammed Farid',
    type: 'email',
    date: '2024-01-19',
    time: '3:00 PM',
    notes: 'Sent detailed project comparison',
    status: 'completed',
  },
];

// Mock Messages (WhatsApp)
export const mockMessages: Message[] = [
  {
    id: '1',
    leadId: '1',
    leadName: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    content: 'Hi, I saw your ad for 3BHK apartments in Whitefield. Can you share more details?',
    timestamp: '2024-01-20 10:30 AM',
    direction: 'incoming',
    status: 'read',
    type: 'text',
  },
  {
    id: '2',
    leadId: '1',
    leadName: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    content: 'Hello Rajesh! Thank you for your interest. We have excellent 3BHK options in Whitefield starting from ₹55L. Would you like to schedule a site visit?',
    timestamp: '2024-01-20 10:35 AM',
    direction: 'outgoing',
    status: 'read',
    type: 'text',
  },
  {
    id: '3',
    leadId: '1',
    leadName: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    content: 'Yes, please share the brochure first.',
    timestamp: '2024-01-20 10:40 AM',
    direction: 'incoming',
    status: 'read',
    type: 'text',
  },
  {
    id: '4',
    leadId: '2',
    leadName: 'Anita Desai',
    phone: '+91 87654 32109',
    content: 'What is the possession date for Green Valley?',
    timestamp: '2024-01-20 2:15 PM',
    direction: 'incoming',
    status: 'read',
    type: 'text',
  },
  {
    id: '5',
    leadId: '2',
    leadName: 'Anita Desai',
    phone: '+91 87654 32109',
    content: 'Green Valley possession is expected by December 2024. We have ready units also available if you need immediate possession.',
    timestamp: '2024-01-20 2:20 PM',
    direction: 'outgoing',
    status: 'delivered',
    type: 'text',
  },
  {
    id: '6',
    leadId: '3',
    leadName: 'Mohammed Farid',
    phone: '+91 76543 21098',
    content: 'Please send me the payment plan for Sunrise Heights 4BHK',
    timestamp: '2024-01-21 9:00 AM',
    direction: 'incoming',
    status: 'delivered',
    type: 'text',
  },
];

// Mock Users/Team
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    email: 'priya.sharma@realestate.com',
    phone: '+91 99887 76655',
    role: 'manager',
    avatar: '/placeholder.svg',
    leadsAssigned: 45,
    dealsClosed: 12,
  },
  {
    id: '2',
    name: 'Vikram Singh',
    email: 'vikram.singh@realestate.com',
    phone: '+91 88776 65544',
    role: 'agent',
    avatar: '/placeholder.svg',
    leadsAssigned: 32,
    dealsClosed: 8,
  },
  {
    id: '3',
    name: 'Amit Kumar',
    email: 'amit.kumar@realestate.com',
    phone: '+91 77665 54433',
    role: 'agent',
    avatar: '/placeholder.svg',
    leadsAssigned: 28,
    dealsClosed: 6,
  },
  {
    id: '4',
    name: 'Neha Gupta',
    email: 'neha.gupta@realestate.com',
    phone: '+91 66554 43322',
    role: 'telecaller',
    avatar: '/placeholder.svg',
    leadsAssigned: 50,
    dealsClosed: 0,
  },
  {
    id: '5',
    name: 'Admin User',
    email: 'admin@realestate.com',
    phone: '+91 55443 32211',
    role: 'admin',
    avatar: '/placeholder.svg',
    leadsAssigned: 0,
    dealsClosed: 0,
  },
];

// Mock Workflows
export const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'New Lead Welcome Message',
    trigger: 'When new lead is created',
    action: 'Send WhatsApp welcome message',
    status: 'active',
    lastRun: '2024-01-20 10:30 AM',
    runsCount: 156,
  },
  {
    id: '2',
    name: 'No Response Reminder',
    trigger: 'Lead not responding for 24 hours',
    action: 'Send WhatsApp follow-up message',
    status: 'active',
    lastRun: '2024-01-20 8:00 AM',
    runsCount: 89,
  },
  {
    id: '3',
    name: 'Site Visit Reminder',
    trigger: '2 hours before scheduled visit',
    action: 'Send reminder to lead & agent',
    status: 'active',
    lastRun: '2024-01-19 9:00 AM',
    runsCount: 45,
  },
  {
    id: '4',
    name: 'Post Visit Follow-up',
    trigger: 'After site visit is completed',
    action: 'Send thank you & feedback request',
    status: 'active',
    lastRun: '2024-01-18 3:00 PM',
    runsCount: 34,
  },
  {
    id: '5',
    name: 'Birthday Wishes',
    trigger: 'On lead birthday',
    action: 'Send birthday greeting via WhatsApp',
    status: 'inactive',
    runsCount: 12,
  },
];

// Analytics Data
export const analyticsData = {
  totalLeads: 156,
  newLeadsToday: 8,
  hotLeads: 23,
  closedWon: 18,
  closedLost: 12,
  conversionRate: 11.5,
  leadsBySource: [
    { source: 'Facebook Ads', count: 45 },
    { source: '99acres', count: 32 },
    { source: 'MagicBricks', count: 28 },
    { source: 'Website', count: 24 },
    { source: 'Referral', count: 18 },
    { source: 'Walk-in', count: 9 },
  ],
  leadsByStage: [
    { stage: 'New', count: 34 },
    { stage: 'Contacted', count: 28 },
    { stage: 'Follow-up', count: 42 },
    { stage: 'Site Visit', count: 22 },
    { stage: 'Negotiation', count: 12 },
    { stage: 'Closed Won', count: 18 },
  ],
  agentPerformance: [
    { name: 'Priya Sharma', leads: 45, followUps: 38, deals: 12 },
    { name: 'Vikram Singh', leads: 32, followUps: 28, deals: 8 },
    { name: 'Amit Kumar', leads: 28, followUps: 22, deals: 6 },
    { name: 'Neha Gupta', leads: 50, followUps: 45, deals: 0 },
  ],
  propertyInterest: [
    { property: 'Sunrise Heights', shares: 89, clicks: 234 },
    { property: 'Green Valley', shares: 76, clicks: 198 },
    { property: 'Royal Orchid', shares: 45, clicks: 156 },
    { property: 'Metro Plaza', shares: 32, clicks: 89 },
  ],
};
