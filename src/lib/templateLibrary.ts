export interface LibraryTemplate {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  industry: 'real_estate' | 'education' | 'automobile_dealers';
  body_text: string;
  variables: string[];
  header_type: 'none' | 'text' | 'image' | 'document' | 'video';
  footer_text: string | null;
}

export const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  // Real Estate (4 templates)
  {
    name: 'new_project_launch',
    category: 'MARKETING',
    industry: 'real_estate',
    body_text: 'Hello {{customer_name}}, Introducing {{project_name}} in {{location}}. Starting from ₹{{price}}. Book your site visit today.',
    variables: ['customer_name', 'project_name', 'location', 'price'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'site_visit_reminder',
    category: 'UTILITY',
    industry: 'real_estate',
    body_text: 'Hello {{customer_name}}, Reminder for your site visit at {{project_name}} on {{date}} at {{time}}.',
    variables: ['customer_name', 'project_name', 'date', 'time'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'property_brochure',
    category: 'MARKETING',
    industry: 'real_estate',
    body_text: 'Hello {{customer_name}}, Here is the brochure for {{project_name}}: {{brochure_link}}. Contact us for details.',
    variables: ['customer_name', 'project_name', 'brochure_link'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'price_drop_alert',
    category: 'MARKETING',
    industry: 'real_estate',
    body_text: 'Hello {{customer_name}}, Special offer now available for {{project_name}} in {{location}}! Price dropped to ₹{{price}}. Contact us now.',
    variables: ['customer_name', 'project_name', 'location', 'price'],
    header_type: 'none',
    footer_text: null
  },

  // Education (4 templates)
  {
    name: 'admissions_open',
    category: 'MARKETING',
    industry: 'education',
    body_text: 'Hello {{student_name}}, Admissions are open for {{course_name}}. Limited seats. Apply today.',
    variables: ['student_name', 'course_name'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'fee_reminder',
    category: 'UTILITY',
    industry: 'education',
    body_text: 'Hello {{student_name}}, Your fee of ₹{{amount}} is due on {{date}}. Please pay to avoid late charges.',
    variables: ['student_name', 'amount', 'date'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'demo_class_invitation',
    category: 'MARKETING',
    industry: 'education',
    body_text: 'Hello {{student_name}}, Join our free demo class for {{course_name}} on {{date}} at {{time}}.',
    variables: ['student_name', 'course_name', 'date', 'time'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'result_announcement',
    category: 'UTILITY',
    industry: 'education',
    body_text: 'Hello {{student_name}}, Your result for {{course_name}} is available. Contact us for details.',
    variables: ['student_name', 'course_name'],
    header_type: 'none',
    footer_text: null
  },

  // Automobile (4 templates)
  {
    name: 'new_vehicle_launch',
    category: 'MARKETING',
    industry: 'automobile_dealers',
    body_text: 'Hello {{customer_name}}, Introducing the all-new {{vehicle_name}}. Book a test drive today.',
    variables: ['customer_name', 'vehicle_name'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'test_drive_reminder',
    category: 'UTILITY',
    industry: 'automobile_dealers',
    body_text: 'Hello {{customer_name}}, Your test drive for {{vehicle_name}} is on {{date}} at {{time}}.',
    variables: ['customer_name', 'vehicle_name', 'date', 'time'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'service_reminder',
    category: 'UTILITY',
    industry: 'automobile_dealers',
    body_text: 'Hello {{customer_name}}, Your vehicle service is due on {{date}}. Book your appointment now.',
    variables: ['customer_name', 'date'],
    header_type: 'none',
    footer_text: null
  },
  {
    name: 'exchange_offer',
    category: 'MARKETING',
    industry: 'automobile_dealers',
    body_text: 'Hello {{customer_name}}, Special exchange offer of up to ₹{{offer_amount}} on the all-new {{vehicle_name}}. Contact us today.',
    variables: ['customer_name', 'offer_amount', 'vehicle_name'],
    header_type: 'none',
    footer_text: null
  }
];
