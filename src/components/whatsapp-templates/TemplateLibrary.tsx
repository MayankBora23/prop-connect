import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Building2, Car, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrebuiltTemplate {
  name: string;
  label: string;
  industry: 'real_estate' | 'education' | 'automobile';
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  headerType: 'TEXT' | 'IMAGE' | 'NONE';
  headerText?: string;
  content: string;
  footerText?: string;
  variables: string[];
  buttons: any[];
}

const prebuiltTemplates: PrebuiltTemplate[] = [
  // Real Estate Templates
  {
    name: 'new_project_launch',
    label: 'New Project Launch',
    industry: 'real_estate',
    category: 'MARKETING',
    headerType: 'TEXT',
    headerText: 'Exclusive Pre-Launch Access 🚀',
    content: 'Hello {{customer_name}},\n\nIntroducing {{project_name}} in {{location}}! A premium residential development featuring state-of-the-art amenities and prime location.\n\nStarting from ₹{{price}}.\n\nBook your priority site visit today!',
    footerText: 'AiLeadX Real Estate Services',
    variables: ['customer_name', 'project_name', 'location', 'price'],
    buttons: [
      { type: 'URL', text: 'View Project Details', url: 'https://aileadx.com/projects' },
      { type: 'QUICK_REPLY', text: 'Book Site Visit' }
    ]
  },
  {
    name: 'property_brochure',
    label: 'Property Brochure',
    industry: 'real_estate',
    category: 'MARKETING',
    headerType: 'IMAGE',
    content: 'Hello {{customer_name}},\n\nThank you for your interest. Here is the digital brochure for {{project_name}} detailing floor plans, pricing, and amenities.\n\nBrochure Link: {{brochure_link}}\n\nContact us directly for special spot-booking offers!',
    footerText: 'Tap below to download brochure',
    variables: ['customer_name', 'project_name', 'brochure_link'],
    buttons: [
      { type: 'PHONE_NUMBER', text: 'Call Advisor', phone_number: '+919999999999' }
    ]
  },
  {
    name: 'site_visit_reminder',
    label: 'Site Visit Reminder',
    industry: 'real_estate',
    category: 'UTILITY',
    headerType: 'TEXT',
    headerText: 'Upcoming Site Visit Reminder 🗓️',
    content: 'Hello {{customer_name}},\n\nThis is a friendly reminder for your scheduled site visit tomorrow.\n\n📍 Project: {{project_name}}\n📅 Date: {{date}}\n⏰ Time: {{time}}\n\nOur relationship manager will meet you at the site lobby.',
    variables: ['customer_name', 'project_name', 'date', 'time'],
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirm Visit' },
      { type: 'QUICK_REPLY', text: 'Reschedule' }
    ]
  },
  {
    name: 'price_drop_alert',
    label: 'Price Drop Alert',
    industry: 'real_estate',
    category: 'MARKETING',
    headerType: 'TEXT',
    headerText: 'Exclusive Price Drop Alert! 📉',
    content: 'Hello {{customer_name}},\n\nGreat news! A special price drop is now available for your favorite property {{project_name}}.\n\nThis is a limited-time inventory discount. Contact us immediately to lock in the lowest rates.',
    footerText: 'Valid till inventory lasts',
    variables: ['customer_name', 'project_name'],
    buttons: [
      { type: 'URL', text: 'Claim Offer', url: 'https://aileadx.com/offers' }
    ]
  },

  // Coaching/Education Templates
  {
    name: 'admissions_open',
    label: 'Admissions Open',
    industry: 'education',
    category: 'MARKETING',
    headerType: 'TEXT',
    headerText: 'Admissions Open 2026-27 🎓',
    content: 'Hello {{student_name}},\n\nAdmissions are now open for our flagship {{course_name}} batch. Get access to comprehensive study materials, weekly test series, and expert mentorship.\n\nLimited seats available. Secure your future today!',
    footerText: 'Scholarships available based on test scores',
    variables: ['student_name', 'course_name'],
    buttons: [
      { type: 'URL', text: 'Apply Online', url: 'https://aileadx.edu/apply' }
    ]
  },
  {
    name: 'fee_reminder',
    label: 'Fee Payment Reminder',
    industry: 'education',
    category: 'UTILITY',
    headerType: 'TEXT',
    headerText: 'Academic Fee Due Alert 💳',
    content: 'Hello {{student_name}},\n\nThis is a gentle reminder that your fee payment of ₹{{amount}} is due on {{date}}.\n\nPlease complete the payment online to avoid late fees and maintain uninterrupted access to classes and portals.',
    footerText: 'Secure digital payment receipt will be shared',
    variables: ['student_name', 'amount', 'date'],
    buttons: [
      { type: 'URL', text: 'Pay Fees Now', url: 'https://aileadx.edu/pay' }
    ]
  },
  {
    name: 'demo_class_invitation',
    label: 'Demo Class Invitation',
    industry: 'education',
    category: 'MARKETING',
    headerType: 'TEXT',
    headerText: 'Free Live Demo Class Invitation 🖥️',
    content: 'Hello {{student_name}},\n\nJoin our upcoming free live demo class for {{course_name}}.\n\n📅 Date: {{date}}\n⏰ Time: {{time}}\n\nInteract directly with our top mentors and get your doubts resolved instantly!',
    variables: ['student_name', 'course_name', 'date', 'time'],
    buttons: [
      { type: 'QUICK_REPLY', text: 'Register For Demo' }
    ]
  },
  {
    name: 'result_announcement',
    label: 'Result Announcement',
    industry: 'education',
    category: 'UTILITY',
    headerType: 'TEXT',
    headerText: 'Exam Results Released 🎉',
    content: 'Hello {{student_name}},\n\nYour evaluation results are now available online.\n\nGreat job on completing your assessments! Contact the admin desk or check your learning portal for details and progress reports.',
    variables: ['student_name'],
    buttons: [
      { type: 'URL', text: 'View Report Card', url: 'https://aileadx.edu/portal' }
    ]
  },

  // Automobile Templates
  {
    name: 'new_vehicle_launch',
    label: 'New Vehicle Launch',
    industry: 'automobile',
    category: 'MARKETING',
    headerType: 'IMAGE',
    content: 'Hello {{customer_name}},\n\nIntroducing the all-new {{vehicle_name}}! Packed with futuristic technology, superior safety features, and top-in-class performance.\n\nBook your test drive today to experience absolute luxury.',
    footerText: 'AiLeadX Auto Dealers',
    variables: ['customer_name', 'vehicle_name'],
    buttons: [
      { type: 'QUICK_REPLY', text: 'Book Test Drive' },
      { type: 'URL', text: 'Explore Variants', url: 'https://aileadx.com/vehicles' }
    ]
  },
  {
    name: 'test_drive_reminder',
    label: 'Test Drive Reminder',
    industry: 'automobile',
    category: 'UTILITY',
    headerType: 'TEXT',
    headerText: 'Test Drive Appointment Scheduled 🔑',
    content: 'Hello {{customer_name}},\n\nYour test drive for the {{vehicle_name}} is scheduled and ready!\n\n📅 Date: {{date}}\n⏰ Time: {{time}}\n\nPlease carry your valid driving license for verification.',
    footerText: 'Reach dealership 10 minutes prior',
    variables: ['customer_name', 'vehicle_name', 'date', 'time'],
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirm Schedule' }
    ]
  },
  {
    name: 'service_reminder',
    label: 'Vehicle Service Reminder',
    industry: 'automobile',
    category: 'UTILITY',
    headerType: 'TEXT',
    headerText: 'Routine Service Appointment Due 🛠️',
    content: 'Hello {{customer_name}},\n\nYour vehicle service is due on {{date}} to ensure peak performance and valid warranty coverages.\n\nBook your appointment now to secure your preferred slot and free wash voucher.',
    variables: ['customer_name', 'date'],
    buttons: [
      { type: 'QUICK_REPLY', text: 'Book Slot Now' },
      { type: 'PHONE_NUMBER', text: 'Call Service Desk', phone_number: '+919999999998' }
    ]
  },
  {
    name: 'exchange_offer',
    label: 'Exchange Offer',
    industry: 'automobile',
    category: 'MARKETING',
    headerType: 'TEXT',
    headerText: 'Upgrade Your Ride Today! 🔄',
    content: 'Hello {{customer_name}},\n\nGet the best value for your older car! Special exchange offers and finance rates are now active for the newly launched {{vehicle_name}}.\n\nEvaluate your car value for free today.',
    variables: ['customer_name', 'vehicle_name'],
    buttons: [
      { type: 'QUICK_REPLY', text: 'Evaluate My Car' }
    ]
  }
];

interface TemplateLibraryProps {
  onSelectTemplate: (template: PrebuiltTemplate) => void;
  currentIndustry?: string;
}

export function TemplateLibrary({ onSelectTemplate, currentIndustry }: TemplateLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>(
    currentIndustry === 'education'
      ? 'education'
      : currentIndustry === 'automobile_dealers'
      ? 'automobile'
      : 'real_estate'
  );

  const filtered = prebuiltTemplates.filter((temp) => {
    const matchesSearch = temp.label.toLowerCase().includes(search.toLowerCase()) || 
                          temp.content.toLowerCase().includes(search.toLowerCase());
    const matchesIndustry = temp.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 p-1 rounded-lg bg-secondary/50 border border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIndustry('real_estate')}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-md transition-all',
              selectedIndustry === 'real_estate' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
            )}
          >
            <Building2 className="w-3.5 h-3.5 mr-2" />
            Real Estate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIndustry('education')}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-md transition-all',
              selectedIndustry === 'education' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
            )}
          >
            <BookOpen className="w-3.5 h-3.5 mr-2" />
            Coaching/Education
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIndustry('automobile')}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-md transition-all',
              selectedIndustry === 'automobile' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
            )}
          >
            <Car className="w-3.5 h-3.5 mr-2" />
            Automobile Dealers
          </Button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-9 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? (
          filtered.map((template) => (
            <Card key={template.name} className="card-elevated border-0 relative overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary/80 to-primary absolute top-0 left-0" />
              
              <CardHeader className="pt-6 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-[10px] font-semibold tracking-wider">
                    {template.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Language: {template.language || 'en_US'}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {template.label}
                </CardTitle>
                <CardDescription className="text-xs">
                  Trigger/Usage: WhatsApp Notification
                </CardDescription>
              </CardHeader>

              <CardContent className="py-2 flex-grow">
                <div className="rounded-lg bg-secondary/30 border border-border p-3 space-y-2 text-xs leading-relaxed max-h-48 overflow-y-auto font-medium text-foreground whitespace-pre-wrap">
                  {template.headerText && (
                    <div className="font-bold text-foreground border-b border-border/50 pb-1.5 mb-1.5">
                      {template.headerText}
                    </div>
                  )}
                  {template.headerType === 'IMAGE' && (
                    <div className="text-[10px] uppercase font-bold text-muted-foreground bg-secondary px-2 py-1 rounded w-fit flex items-center gap-1.5 mb-2">
                      🖼️ Image Header Placeholder
                    </div>
                  )}
                  {template.content}
                  {template.footerText && (
                    <div className="text-[10px] text-muted-foreground border-t border-border/50 pt-1.5 mt-1.5">
                      {template.footerText}
                    </div>
                  )}
                </div>

                {/* Variable chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {template.variables.map((v) => (
                    <span key={v} className="bg-primary/5 text-primary text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pt-4 pb-6 flex items-center justify-between border-t border-border/50 mt-4">
                <div className="text-[10px] text-muted-foreground font-semibold">
                  Buttons: {template.buttons.length} configured
                </div>
                <Button 
                  onClick={() => onSelectTemplate(template)}
                  size="sm"
                  className="gradient-primary border-0 text-xs font-semibold px-4 h-8 flex items-center justify-center gap-1.5 shadow-sm hover:shadow group-hover:scale-[1.02] transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm font-medium">
            No prebuilt templates match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
