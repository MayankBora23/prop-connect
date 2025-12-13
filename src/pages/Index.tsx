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

const tabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
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

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);
  const [addWorkflowOpen, setAddWorkflowOpen] = useState(false);

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
    }
  };

  const config = tabConfig[activeTab];

  const renderContent = () => {
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
      
      <AIChatAssistant />
    </div>
  );
};

export default Index;
