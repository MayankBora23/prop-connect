import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { UpgradePlanDialog } from '@/components/settings/UpgradePlanDialog';
import { Lock, Clock, Check, Sparkles, ShieldAlert, LogOut, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LeadsView } from '@/components/leads/LeadsView';
import { PropertiesView } from '@/components/properties/PropertiesView';
import { PurchasedView } from '@/components/purchased/PurchasedView';
import { WhatsAppInbox } from '@/components/inbox/WhatsAppInbox';
import { EducationWhatsAppInbox } from '@/components/education/WhatsAppInbox';
import { AutomobileWhatsAppInbox } from '@/components/automobile/WhatsAppInbox';
import { SiteVisitsView } from '@/components/visits/SiteVisitsView';
import { FollowUpsView } from '@/components/followups/FollowUpsView';
import { TeamView } from '@/components/team/TeamView';
import { AutomationView } from '@/components/automation/AutomationView';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { CompanySettingsView } from '@/components/settings/CompanySettingsView';
import { ProfileSettingsView } from '@/components/settings/ProfileSettingsView';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog';
import { AddSiteVisitDialog } from '@/components/visits/AddSiteVisitDialog';
import { AddFollowUpDialog } from '@/components/followups/AddFollowUpDialog';
import { AddWorkflowDialog } from '@/components/automation/AddWorkflowDialog';
import { AIChatAssistant } from '@/components/chat/AIChatAssistant';
import { PersonalWorkspace } from '@/components/workspace/PersonalWorkspace';
import { useIndustry } from '@/hooks/useIndustry';
import { EducationDashboard } from '@/components/education/EducationDashboard';
import { StudentsView } from '@/components/education/StudentsView';
import { CoursesView } from '@/components/education/CoursesView';
import { BatchesView } from '@/components/education/BatchesView';
import { EnrollmentsView } from '@/components/education/EnrollmentsView';
import { TeachersView } from '@/components/education/TeachersView';
import { AttendanceView } from '@/components/education/AttendanceView';
import { AddStudentDialog } from '@/components/education/AddStudentDialog';
import { AddCourseDialog } from '@/components/education/AddCourseDialog';
import { AddBatchDialog } from '@/components/education/AddBatchDialog';
import { AddTeacherDialog } from '@/components/education/AddTeacherDialog';
import { EducationAnalytics } from '@/components/education/EducationAnalytics';
import { AutomobileDashboard } from '@/components/automobile/AutomobileDashboard';
import { VehiclesView } from '@/components/automobile/VehiclesView';
import { AutoLeadsView } from '@/components/automobile/AutoLeadsView';
import { TestDrivesView } from '@/components/automobile/TestDrivesView';
import { BookingsView } from '@/components/automobile/BookingsView';
import { DealsView } from '@/components/automobile/DealsView';
import { FinanceView } from '@/components/automobile/FinanceView';
import { InsuranceView } from '@/components/automobile/InsuranceView';
import { AddAutoLeadDialog } from '@/components/automobile/AddAutoLeadDialog';
import { AddVehicleDialog } from '@/components/automobile/AddVehicleDialog';
import { AddTestDriveDialog } from '@/components/automobile/AddTestDriveDialog';
import { AddBookingDialog } from '@/components/automobile/AddBookingDialog';
import { AddDealDialog } from '@/components/automobile/AddDealDialog';
import { AddFinanceDialog } from '@/components/automobile/AddFinanceDialog';
import { AddInsuranceDialog } from '@/components/automobile/AddInsuranceDialog';
import { EmployeesView } from '@/components/employees/EmployeesView';
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog';
import { AttendanceView as EmployeeAttendanceView } from '@/components/employee-attendance/AttendanceView';
import { AttendanceView as StudentAttendanceView } from '@/components/education/AttendanceView';
import { AutomobileEmployeesView } from '@/components/automobile/AutomobileEmployeesView';
import { AutomobileAttendanceView } from '@/components/automobile/AutomobileAttendanceView';
import { TelephonyView } from '@/components/telephony/TelephonyView';
import { InternalCRMDashboard } from '@/components/internalcrm/InternalCRMDashboard';
import { CompaniesView } from '@/components/internalcrm/CompaniesView';
import { InternalCRMWhatsAppInbox } from '@/components/internalcrm/WhatsAppInbox';
import { InternalLeadsView } from '@/components/internalcrm/leads/InternalLeadsView';
import { InternalDemosView } from '@/components/internalcrm/InternalDemosView';
import { AddInternalLeadDialog } from '@/components/internalcrm/leads/AddInternalLeadDialog';
import { CreditsView } from '@/components/credits/CreditsView';
import { LowBalanceAlert } from '@/components/credits/LowBalanceAlert';
import { SupportView } from '@/components/support/SupportView';
import { TeamReportView } from '@/components/reports/TeamReportView';
import { TemplatesDashboard } from '@/components/whatsapp-templates/TemplatesDashboard';

const realEstateTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back!' },
  leads: { title: 'Lead Management', subtitle: 'Manage your sales pipeline', addLabel: 'Add Lead' },
  properties: { title: 'Properties', subtitle: 'Your property inventory', addLabel: 'Add Property' },
  employees: { title: 'Employee Management', subtitle: 'Manage your employee profiles', addLabel: 'Add Employee' },
  'employee-attendance': { title: 'Employee Attendance', subtitle: 'Track employee attendance and working hours', addLabel: 'Mark Attendance' },
  purchased: { title: 'Purchased', subtitle: 'Closed won deals and property purchases' },
  inbox: { title: 'WhatsApp Inbox', subtitle: 'Customer conversations' },
  telephony: { title: 'Telephony', subtitle: 'Call management and dialer' },
  visits: { title: 'Site Visits', subtitle: 'Scheduled property visits', addLabel: 'Schedule Visit' },
  followups: { title: 'Follow-ups', subtitle: 'Track your tasks', addLabel: 'Add Follow-up' },
  workspace: { title: 'Personal Workspace', subtitle: 'Chat with your team and manage tasks' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  automation: { title: 'Automation', subtitle: 'Workflow automations', addLabel: 'Create Workflow' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  reports: { title: 'Team Performance Report', subtitle: 'Productivity and task metrics for your CRM team' },
  credits: { title: 'Credits', subtitle: 'WhatsApp usage and wallet balance' },
  support: { title: 'Support', subtitle: 'Help desk and tickets' },
  'profile-settings': { title: 'Profile Settings', subtitle: 'Manage your personal information' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
  'whatsapp-templates': { title: 'WhatsApp Template Management', subtitle: 'Create, sync, and send WhatsApp templates' },
};

const educationTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back!' },
  students: { title: 'Students', subtitle: 'Manage your students', addLabel: 'Add Student' },
  courses: { title: 'Courses', subtitle: 'Course catalog', addLabel: 'Add Course' },
  batches: { title: 'Batches', subtitle: 'Manage batches', addLabel: 'Add Batch' },
  teachers: { title: 'Teachers', subtitle: 'Faculty management', addLabel: 'Add Teacher' },
  enrollments: { title: 'Enrollments', subtitle: 'Student enrollments' },
  attendance: { title: 'Attendance', subtitle: 'Track attendance' },
  employees: { title: 'Employee Management', subtitle: 'Manage your employee profiles', addLabel: 'Add Employee' },
  'employee-attendance': { title: 'Employee Attendance', subtitle: 'Track employee attendance and working hours', addLabel: 'Mark Attendance' },
  fees: { title: 'Fees', subtitle: 'Fee management' },
  telephony: { title: 'Telephony', subtitle: 'Call management and dialer' },
  'whatsapp-inbox': { title: 'WhatsApp Inbox', subtitle: 'Student conversations' },
  workspace: { title: 'Personal Workspace', subtitle: 'Chat with your team and manage tasks' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  reports: { title: 'Team Performance Report', subtitle: 'Productivity and task metrics for your CRM team' },
  credits: { title: 'Credits', subtitle: 'WhatsApp usage and wallet balance' },
  support: { title: 'Support', subtitle: 'Help desk and tickets' },
  'profile-settings': { title: 'Profile Settings', subtitle: 'Manage your personal information' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
  'whatsapp-templates': { title: 'WhatsApp Template Management', subtitle: 'Create, sync, and send WhatsApp templates' },
};

/* healthcare removed */

const automobileTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back!' },
  vehicles: { title: 'Vehicles', subtitle: 'Manage your inventory', addLabel: 'Add Vehicle' },
  leads: { title: 'Leads', subtitle: 'Customer inquiries and prospects', addLabel: 'Add Lead' },
  'test-drives': { title: 'Test Drives', subtitle: 'Scheduled test drives', addLabel: 'Schedule Test Drive' },
  bookings: { title: 'Bookings', subtitle: 'Vehicle bookings and reservations', addLabel: 'Create Booking' },
  deals: { title: 'Deals', subtitle: 'Closed deals and sales', addLabel: 'Add Deal' },
  finance: { title: 'Finance', subtitle: 'Finance applications', addLabel: 'Add Finance Application' },
  insurance: { title: 'Insurance', subtitle: 'Insurance sales and policies', addLabel: 'Add Insurance Sale' },
  employees: { title: 'Employees', subtitle: 'Manage your automobile dealership staff', addLabel: 'Add Employee' },
  'employee-attendance': { title: 'Employee Attendance', subtitle: 'Track staff attendance and working hours' },
  telephony: { title: 'Telephony', subtitle: 'Call management and dialer' },
  'whatsapp-inbox': { title: 'WhatsApp Inbox', subtitle: 'Auto lead conversations' },
  workspace: { title: 'Personal Workspace', subtitle: 'Chat with your team and manage tasks' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  reports: { title: 'Team Performance Report', subtitle: 'Productivity and task metrics for your CRM team' },
  credits: { title: 'Credits', subtitle: 'WhatsApp usage and wallet balance' },
  support: { title: 'Support', subtitle: 'Help desk and tickets' },
  'profile-settings': { title: 'Profile Settings', subtitle: 'Manage your personal information' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
  'whatsapp-templates': { title: 'WhatsApp Template Management', subtitle: 'Create, sync, and send WhatsApp templates' },
};

const internalCRMTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Internal Dashboard', subtitle: 'Platform overview' },
  leads: { title: 'Lead Management', subtitle: 'Manage platform leads', addLabel: 'Add Lead' },
  demos: { title: 'Demo Management', subtitle: 'Scheduled CRM demos', addLabel: 'Schedule Demo' },
  companies: { title: 'Company Management', subtitle: 'Manage registered companies', addLabel: 'Register Company' },
  employees: { title: 'Employee Management', subtitle: 'Manage platform staff', addLabel: 'Add Employee' },
  'employee-attendance': { title: 'Employee Attendance', subtitle: 'Track platform staff attendance', addLabel: 'Mark Attendance' },
  'whatsapp-inbox': { title: 'WhatsApp Inbox', subtitle: 'Global conversations' },
  telephony: { title: 'Telephony', subtitle: 'Call management' },
  workspace: { title: 'Personal Workspace', subtitle: 'Internal collaboration' },
  team: { title: 'Team Management', subtitle: 'Platform administrators' },
  analytics: { title: 'Platform Analytics', subtitle: 'System performance' },
  reports: { title: 'Team Performance Report', subtitle: 'Productivity and task metrics for your CRM team' },
  credits: { title: 'Credits', subtitle: 'WhatsApp usage and wallet balance' },
  support: { title: 'Client Support', subtitle: 'Tickets from all client companies' },
  'profile-settings': { title: 'Profile Settings', subtitle: 'Manage your personal information' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage platform settings' },
  'whatsapp-templates': { title: 'WhatsApp Template Management', subtitle: 'Create, sync, and send WhatsApp templates' },
};

/* online business removed */

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);
  const [addWorkflowOpen, setAddWorkflowOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [addAutoLeadOpen, setAddAutoLeadOpen] = useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addTestDriveOpen, setAddTestDriveOpen] = useState(false);
  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [addFinanceOpen, setAddFinanceOpen] = useState(false);
  const [addInsuranceOpen, setAddInsuranceOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [addInternalLeadOpen, setAddInternalLeadOpen] = useState(false);

  const { data: company, isLoading: companyLoading } = useCurrentCompany();
  const { signOut } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: industry, isLoading: industryLoading, isLoaded } = useIndustry();

  if (industryLoading || !isLoaded || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-muted w-16 h-16 border-t-primary" />
      </div>
    );
  }

  // Trial Period Calculations
  const createdAt = company?.created_at ? new Date(company.created_at) : new Date();
  const trialDurationDays = 14;
  const trialEndsAt = company?.trial_ends_at 
    ? new Date(company.trial_ends_at) 
    : new Date(createdAt.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const isPremium = company?.plan_type === 'premium' || company?.status_notes === 'premium' || company?.plan_type === 'bypass' || company?.status_notes === 'bypass';
  
  const timeDiff = trialEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  const isTrialExpired = daysRemaining <= 0;

  // Block dashboard access if trial has ended and they haven't upgraded
  const shouldBlockForTrial = industry !== 'internal_crm' && !isPremium && isTrialExpired;

  if (shouldBlockForTrial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-orange-500/5 blur-3xl" />

        <div className="w-full max-w-lg z-10">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">RealCRM</h1>
              <p className="text-xs text-muted-foreground">Multi-Industry CRM</p>
            </div>
          </div>

          <Card className="card-elevated border-0 relative overflow-hidden">
            {/* Top decorative stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-primary absolute top-0 left-0" />
            
            <CardHeader className="text-center pt-8 pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4 relative">
                <Lock className="w-7 h-7 text-orange-500" />
                <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 animate-ping" style={{ animationDuration: '3s' }} />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Your Free Trial Has Expired
              </CardTitle>
              <CardDescription className="text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                Your 14-day free trial of RealCRM has ended. Upgrade to Premium to securely unlock your database, leads, and continue team collaborations.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 md:px-8 py-4">
              <div className="rounded-lg bg-secondary/50 p-4 border border-border space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  What is waiting for you in Premium:
                </p>
                <ul className="space-y-2 text-xs text-foreground font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Unlimited Leads, Courses, Properties, and Batches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Full Outbound Telephony Dialer & Call Analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Shared WhatsApp Inbox & Automated Lead Qualification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Multi-Industry Custom Dashboards</span>
                  </li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 px-6 md:px-8 pb-8 pt-2">
              <Button 
                onClick={() => setUpgradeOpen(true)}
                className="w-full gradient-primary border-0 py-2.5 h-auto text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Sparkles className="w-4 h-4 fill-current animate-pulse text-white" />
                Upgrade to Premium Plan
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={async () => {
                  await signOut();
                  window.location.href = '/auth';
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground h-auto py-2"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sign Out / Log in to another account
              </Button>
            </CardFooter>
          </Card>
        </div>

        <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      </div>
    );
  }
  const isEducation = industry === 'education';
  const isAutomobileDealers = industry === 'automobile_dealers';
  const isInternalCRM = industry === 'internal_crm';
  const tabConfig = isEducation ? educationTabConfig :
    isAutomobileDealers ? automobileTabConfig :
      isInternalCRM ? internalCRMTabConfig :
        realEstateTabConfig;

  const handleAddNew = () => {
    switch (activeTab) {
      case 'leads':
        if (isAutomobileDealers) {
          setAddAutoLeadOpen(true);
        } else if (isInternalCRM) {
          setAddInternalLeadOpen(true);
        } else {
          setAddLeadOpen(true);
        }
        break;
      case 'properties':
        setAddPropertyOpen(true);
        break;
      case 'employees':
        setAddEmployeeOpen(true);
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
      case 'courses':
        setAddCourseOpen(true);
        break;
      case 'batches':
        setAddBatchOpen(true);
        break;
      case 'teachers':
        setAddTeacherOpen(true);
        break;
      case 'employee-attendance':
        // This will be handled by the AttendanceView component itself
        break;
      /* patients (healthcare) removed */
      // Automobile cases
      case 'vehicles':
        if (isAutomobileDealers) {
          setAddVehicleOpen(true);
        }
        break;
      case 'test-drives':
        if (isAutomobileDealers) {
          setAddTestDriveOpen(true);
        }
        break;
      case 'bookings':
        if (isAutomobileDealers) {
          setAddBookingOpen(true);
        }
        break;
      case 'deals':
        if (isAutomobileDealers) {
          setAddDealOpen(true);
        }
        break;
      case 'finance':
        if (isAutomobileDealers) {
          setAddFinanceOpen(true);
        }
        break;
      case 'insurance':
        if (isAutomobileDealers) {
          setAddInsuranceOpen(true);
        }
        break;
      /* online business actions removed */
      // More healthcare cases can be added here when dialogs are created
    }
  };

  const config = tabConfig[activeTab] || tabConfig.dashboard;

  const renderContent = () => {
    if (isInternalCRM) {
      switch (activeTab) {
        case 'dashboard':
          return <InternalCRMDashboard />;
        case 'leads':
          return <InternalLeadsView />;
        case 'demos':
          return <InternalDemosView />;
        case 'companies':
          return <CompaniesView />;
        case 'employees':
          return <EmployeesView />;
        case 'employee-attendance':
          return <EmployeeAttendanceView />;
        case 'whatsapp-inbox':
          return <InternalCRMWhatsAppInbox />;
        case 'whatsapp-templates':
          return <TemplatesDashboard />;
        case 'telephony':
          return <TelephonyView />;
        case 'workspace':
          return <PersonalWorkspace />;
        case 'team':
          return <TeamView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'reports':
          return <TeamReportView />;
        case 'credits':
          return <CreditsView />;
        case 'support':
          return <SupportView />;
        case 'profile-settings':
          return <ProfileSettingsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <InternalCRMDashboard />;
      }
    } else if (isEducation) {
      switch (activeTab) {
        case 'dashboard':
          return <EducationDashboard />;
        case 'students':
          return <StudentsView />;
        case 'courses':
          return <CoursesView />;
        case 'batches':
          return <BatchesView />;
        case 'teachers':
          return <TeachersView />;
        case 'enrollments':
          return <EnrollmentsView />;
        case 'attendance':
          return <StudentAttendanceView />;
        case 'employees':
          return <EmployeesView />;
        case 'employee-attendance':
          return <EmployeeAttendanceView />;
        case 'fees':
          return <div className="card-elevated p-6"><p className="text-muted-foreground">Fees view coming soon</p></div>;
        case 'whatsapp-inbox':
          return <EducationWhatsAppInbox />;
        case 'whatsapp-templates':
          return <TemplatesDashboard />;
        case 'workspace':
          return <PersonalWorkspace />;
        case 'team':
          return <TeamView />;
        case 'analytics':
          return <EducationAnalytics />;
        case 'reports':
          return <TeamReportView />;
        case 'telephony':
          return <TelephonyView />;
        case 'credits':
          return <CreditsView />;
        case 'support':
          return <SupportView />;
        case 'profile-settings':
          return <ProfileSettingsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <EducationDashboard />;
      }
    } else if (isAutomobileDealers) {
      switch (activeTab) {
        case 'dashboard':
          return <AutomobileDashboard />;
        case 'vehicles':
          return <VehiclesView />;
        case 'leads':
          return <AutoLeadsView />;
        case 'test-drives':
          return <TestDrivesView />;
        case 'bookings':
          return <BookingsView />;
        case 'deals':
          return <DealsView />;
        case 'finance':
          return <FinanceView />;
        case 'insurance':
          return <InsuranceView />;
        case 'employees':
          return <AutomobileEmployeesView />;
        case 'employee-attendance':
          return <AutomobileAttendanceView />;
        case 'telephony':
          return <TelephonyView />;
        case 'whatsapp-inbox':
          return <AutomobileWhatsAppInbox />;
        case 'whatsapp-templates':
          return <TemplatesDashboard />;
        case 'workspace':
          return <PersonalWorkspace />;
        case 'team':
          return <TeamView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'reports':
          return <TeamReportView />;
        case 'credits':
          return <CreditsView />;
        case 'support':
          return <SupportView />;
        case 'profile-settings':
          return <ProfileSettingsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <AutomobileDashboard />;
      }
    } else {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard />;
        case 'leads':
          return <LeadsView />;
        case 'properties':
          return <PropertiesView />;
        case 'employees':
          return <EmployeesView />;
        case 'employee-attendance':
          return <EmployeeAttendanceView />;
        case 'purchased':
          return <PurchasedView />;
        case 'inbox':
          return <WhatsAppInbox />;
        case 'whatsapp-templates':
          return <TemplatesDashboard />;
        case 'telephony':
          return <TelephonyView />;
        case 'visits':
          return <SiteVisitsView />;
        case 'followups':
          return <FollowUpsView />;
        case 'workspace':
          return <PersonalWorkspace />;
        case 'team':
          return <TeamView />;
        case 'automation':
          return <AutomationView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'reports':
          return <TeamReportView />;
        case 'credits':
          return <CreditsView />;
        case 'support':
          return <SupportView />;
        case 'profile-settings':
          return <ProfileSettingsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <Dashboard />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64',
          activeTab === 'reports' && 'print:ml-0 print:w-full'
        )}
      >
        <div className={cn(activeTab === 'reports' && 'print:hidden')}>
          {!(isAutomobileDealers && activeTab === 'dashboard') && (
            <Header
              title={config.title}
              subtitle={config.subtitle}
              onAddNew={config.addLabel ? handleAddNew : undefined}
              addNewLabel={config.addLabel}
            />
          )}
        </div>

        <div className="p-6">
          {!isInternalCRM && (
            <div className={cn(activeTab === 'reports' && 'print:hidden')}>
              <LowBalanceAlert />
            </div>
          )}
          {renderContent()}
        </div>
      </main>

      <AddLeadDialog open={addLeadOpen} onOpenChange={setAddLeadOpen} />
      <AddPropertyDialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen} />
      <AddSiteVisitDialog open={addVisitOpen} onOpenChange={setAddVisitOpen} />
      <AddFollowUpDialog open={addFollowUpOpen} onOpenChange={setAddFollowUpOpen} />
      <AddWorkflowDialog open={addWorkflowOpen} onOpenChange={setAddWorkflowOpen} />
      <AddStudentDialog open={addStudentOpen} onOpenChange={setAddStudentOpen} />
      <AddCourseDialog open={addCourseOpen} onOpenChange={setAddCourseOpen} />
      <AddBatchDialog open={addBatchOpen} onOpenChange={setAddBatchOpen} />
      <AddTeacherDialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen} />
      <AddAutoLeadDialog open={addAutoLeadOpen} onOpenChange={setAddAutoLeadOpen} />
      <AddVehicleDialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen} />
      <AddTestDriveDialog open={addTestDriveOpen} onOpenChange={setAddTestDriveOpen} />
      <AddBookingDialog open={addBookingOpen} onOpenChange={setAddBookingOpen} />
      <AddDealDialog open={addDealOpen} onOpenChange={setAddDealOpen} />
      <AddFinanceDialog open={addFinanceOpen} onOpenChange={setAddFinanceOpen} />
      <AddInsuranceDialog open={addInsuranceOpen} onOpenChange={setAddInsuranceOpen} />

      <AddInternalLeadDialog open={addInternalLeadOpen} onOpenChange={setAddInternalLeadOpen} />

      <AddEmployeeDialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen} />

      {!isEducation && !isAutomobileDealers && (
        <div className={cn(activeTab === 'reports' && 'print:hidden')}>
          <AIChatAssistant />
        </div>
      )}
    </div>
  );
};

export default Index;
