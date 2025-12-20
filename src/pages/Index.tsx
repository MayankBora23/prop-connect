import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LeadsView } from '@/components/leads/LeadsView';
import { PropertiesView } from '@/components/properties/PropertiesView';
import { WhatsAppInbox } from '@/components/inbox/WhatsAppInbox';
import { SiteVisitsView } from '@/components/visits/SiteVisitsView';
import { FollowUpsView } from '@/components/followups/FollowUpsView';
import { TeamView } from '@/components/team/TeamView';
import { AutomationView } from '@/components/automation/AutomationView';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { CompanySettingsView } from '@/components/settings/CompanySettingsView';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog';
import { AddSiteVisitDialog } from '@/components/visits/AddSiteVisitDialog';
import { AddFollowUpDialog } from '@/components/followups/AddFollowUpDialog';
import { AddWorkflowDialog } from '@/components/automation/AddWorkflowDialog';
import { AIChatAssistant } from '@/components/chat/AIChatAssistant';
import { useIndustry } from '@/hooks/useIndustry';
import { EducationDashboard } from '@/components/education/EducationDashboard';
import { StudentsView } from '@/components/education/StudentsView';
import { CoursesView } from '@/components/education/CoursesView';
import { BatchesView } from '@/components/education/BatchesView';
import { AddStudentDialog } from '@/components/education/AddStudentDialog';

const realEstateTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back!' },
  leads: { title: 'Lead Management', subtitle: 'Manage your sales pipeline', addLabel: 'Add Lead' },
  properties: { title: 'Properties', subtitle: 'Your property inventory', addLabel: 'Add Property' },
  inbox: { title: 'WhatsApp Inbox', subtitle: 'Customer conversations' },
  visits: { title: 'Site Visits', subtitle: 'Scheduled property visits', addLabel: 'Schedule Visit' },
  followups: { title: 'Follow-ups', subtitle: 'Track your tasks', addLabel: 'Add Follow-up' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  automation: { title: 'Automation', subtitle: 'Workflow automations', addLabel: 'Create Workflow' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
};

const educationTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back!' },
  students: { title: 'Students', subtitle: 'Manage your students', addLabel: 'Add Student' },
  courses: { title: 'Courses', subtitle: 'Course catalog', addLabel: 'Add Course' },
  batches: { title: 'Batches', subtitle: 'Manage batches', addLabel: 'Add Batch' },
  enrollments: { title: 'Enrollments', subtitle: 'Student enrollments' },
  attendance: { title: 'Attendance', subtitle: 'Track attendance' },
  fees: { title: 'Fees', subtitle: 'Fee management' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
};

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);
  const [addWorkflowOpen, setAddWorkflowOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  
const { data: industry, isLoading: industryLoading, isLoaded } = useIndustry();
if (industryLoading || !isLoaded) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full border-4 border-muted w-16 h-16 border-t-primary" />
    </div>
  );
}
const isEducation = industry === 'education';
const tabConfig = isEducation ? educationTabConfig : realEstateTabConfig;

  const handleAddNew = () => {
    switch (activeTab) {
      case 'leads':
        setAddLeadOpen(true);
        break;
      case 'properties':
        setAddPropertyOpen(true);
        break;
      case 'visits':
        setAddVisitOpen(true);
        break;
      case 'followups':
        setAddFollowUpOpen(true);
        break;
      case 'automation':
        setAddWorkflowOpen(true);
        break;
      case 'students':
        setAddStudentOpen(true);
        break;
    }
  };

  const config = tabConfig[activeTab] || tabConfig.dashboard;

  const renderContent = () => {
    if (isEducation) {
      switch (activeTab) {
        case 'dashboard':
          return <EducationDashboard />;
        case 'students':
          return <StudentsView />;
        case 'courses':
          return <CoursesView />;
        case 'batches':
          return <BatchesView />;
        case 'enrollments':
          return <div className="card-elevated p-6"><p className="text-muted-foreground">Enrollments view coming soon</p></div>;
        case 'attendance':
          return <div className="card-elevated p-6"><p className="text-muted-foreground">Attendance view coming soon</p></div>;
        case 'fees':
          return <div className="card-elevated p-6"><p className="text-muted-foreground">Fees view coming soon</p></div>;
        case 'team':
          return <TeamView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <EducationDashboard />;
      }
    } else {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard />;
        case 'leads':
          return <LeadsView />;
        case 'properties':
          return <PropertiesView />;
        case 'inbox':
          return <WhatsAppInbox />;
        case 'visits':
          return <SiteVisitsView />;
        case 'followups':
          return <FollowUpsView />;
        case 'team':
          return <TeamView />;
        case 'automation':
          return <AutomationView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <Dashboard />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="ml-64 transition-all duration-300">
        <Header
          title={config.title}
          subtitle={config.subtitle}
          onAddNew={config.addLabel ? handleAddNew : undefined}
          addNewLabel={config.addLabel}
        />
        
        <div className="p-6">
          {renderContent()}
        </div>
      </main>

      <AddLeadDialog open={addLeadOpen} onOpenChange={setAddLeadOpen} />
      <AddPropertyDialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen} />
      <AddSiteVisitDialog open={addVisitOpen} onOpenChange={setAddVisitOpen} />
      <AddFollowUpDialog open={addFollowUpOpen} onOpenChange={setAddFollowUpOpen} />
      <AddWorkflowDialog open={addWorkflowOpen} onOpenChange={setAddWorkflowOpen} />
      <AddStudentDialog open={addStudentOpen} onOpenChange={setAddStudentOpen} />
      
      {!isEducation && <AIChatAssistant />}
    </div>
  );
};

export default Index;
