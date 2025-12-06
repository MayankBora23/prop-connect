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
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const tabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back, Priya!' },
  leads: { title: 'Lead Management', subtitle: 'Manage your sales pipeline', addLabel: 'Add Lead' },
  properties: { title: 'Properties', subtitle: 'Your property inventory', addLabel: 'Add Property' },
  inbox: { title: 'WhatsApp Inbox', subtitle: 'Customer conversations' },
  visits: { title: 'Site Visits', subtitle: 'Scheduled property visits', addLabel: 'Schedule Visit' },
  followups: { title: 'Follow-ups', subtitle: 'Track your tasks' },
  team: { title: 'Team Management', subtitle: 'Your team members', addLabel: 'Add Member' },
  automation: { title: 'Automation', subtitle: 'Workflow automations', addLabel: 'Create Workflow' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
};

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const { toast } = useToast();

  const handleAddNew = () => {
    if (activeTab === 'leads') {
      setAddLeadOpen(true);
    } else {
      toast({
        title: 'Coming Soon',
        description: `Add ${tabConfig[activeTab].addLabel} feature will be available soon.`,
      });
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
    </div>
  );
};

export default Index;
