import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
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
import { HealthcareDashboard } from '@/components/healthcare/HealthcareDashboard';
import { PatientsView } from '@/components/healthcare/PatientsView';
import { AddPatientDialog } from '@/components/healthcare/AddPatientDialog';
import { AppointmentsView } from '@/components/healthcare/AppointmentsView';
import { MedicalRecordsView } from '@/components/healthcare/MedicalRecordsView';
import { PrescriptionsView } from '@/components/healthcare/PrescriptionsView';
import { BillingView } from '@/components/healthcare/BillingView';
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
import { AddProductDialog } from '@/components/online-business/AddProductDialog';
import { AddCustomerDialog } from '@/components/online-business/AddCustomerDialog';
import { AddSupplierDialog } from '@/components/online-business/AddSupplierDialog';
import { AddOrderDialog } from '@/components/online-business/AddOrderDialog';
import { AddPaymentDialog } from '@/components/online-business/AddPaymentDialog';
import { AddDiscountDialog } from '@/components/online-business/AddDiscountDialog';
import { AddReturnDialog } from '@/components/online-business/AddReturnDialog';
import { OnlineBusinessDashboard } from '@/components/online-business/OnlineBusinessDashboard';
import { ProductsView } from '@/components/online-business/ProductsView';
import { InventoryView } from '@/components/online-business/InventoryView';
import { OrdersView } from '@/components/online-business/OrdersView';
import { CustomersView } from '@/components/online-business/CustomersView';
import { PaymentsView } from '@/components/online-business/PaymentsView';
import { ReturnsView } from '@/components/online-business/ReturnsView';
import { DiscountsView } from '@/components/online-business/DiscountsView';
import { SuppliersView } from '@/components/online-business/SuppliersView';
import { BarcodeGenerator } from '@/components/online-business/BarcodeGenerator';
import { EmployeesView } from '@/components/employees/EmployeesView';
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog';
import { AttendanceView as EmployeeAttendanceView } from '@/components/employee-attendance/AttendanceView';
import { AttendanceView as StudentAttendanceView } from '@/components/education/AttendanceView';
import { AutomobileEmployeesView } from '@/components/automobile/AutomobileEmployeesView';
import { AutomobileAttendanceView } from '@/components/automobile/AutomobileAttendanceView';

const realEstateTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back!' },
  leads: { title: 'Lead Management', subtitle: 'Manage your sales pipeline', addLabel: 'Add Lead' },
  properties: { title: 'Properties', subtitle: 'Your property inventory', addLabel: 'Add Property' },
  employees: { title: 'Employee Management', subtitle: 'Manage your employee profiles', addLabel: 'Add Employee' },
  'employee-attendance': { title: 'Employee Attendance', subtitle: 'Track employee attendance and working hours', addLabel: 'Mark Attendance' },
  purchased: { title: 'Purchased', subtitle: 'Closed won deals and property purchases' },
  inbox: { title: 'WhatsApp Inbox', subtitle: 'Customer conversations' },
  visits: { title: 'Site Visits', subtitle: 'Scheduled property visits', addLabel: 'Schedule Visit' },
  followups: { title: 'Follow-ups', subtitle: 'Track your tasks', addLabel: 'Add Follow-up' },
  workspace: { title: 'Personal Workspace', subtitle: 'Chat with your team and manage tasks' },
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
  teachers: { title: 'Teachers', subtitle: 'Faculty management', addLabel: 'Add Teacher' },
  enrollments: { title: 'Enrollments', subtitle: 'Student enrollments' },
  attendance: { title: 'Attendance', subtitle: 'Track attendance' },
  employees: { title: 'Employee Management', subtitle: 'Manage your employee profiles', addLabel: 'Add Employee' },
  'employee-attendance': { title: 'Employee Attendance', subtitle: 'Track employee attendance and working hours', addLabel: 'Mark Attendance' },
  fees: { title: 'Fees', subtitle: 'Fee management' },
  'whatsapp-inbox': { title: 'WhatsApp Inbox', subtitle: 'Student conversations' },
  workspace: { title: 'Personal Workspace', subtitle: 'Chat with your team and manage tasks' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
};

const healthcareTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back!' },
  patients: { title: 'Patients', subtitle: 'Manage your patients', addLabel: 'Add Patient' },
  appointments: { title: 'Appointments', subtitle: 'Schedule and manage appointments', addLabel: 'Add Appointment' },
  'medical-records': { title: 'Medical Records', subtitle: 'Patient medical history', addLabel: 'Add Record' },
  prescriptions: { title: 'Prescriptions', subtitle: 'Manage prescriptions', addLabel: 'Add Prescription' },
  billing: { title: 'Billing', subtitle: 'Billing and payments', addLabel: 'Add Bill' },
  workspace: { title: 'Personal Workspace', subtitle: 'Chat with your team and manage tasks' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
};

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
  'whatsapp-inbox': { title: 'WhatsApp Inbox', subtitle: 'Auto lead conversations' },
  workspace: { title: 'Personal Workspace', subtitle: 'Chat with your team and manage tasks' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
};

const onlineBusinessTabConfig: Record<string, { title: string; subtitle?: string; addLabel?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back!' },
  products: { title: 'Products', subtitle: 'Manage your product catalog', addLabel: 'Add Product' },
  inventory: { title: 'Inventory', subtitle: 'Track stock levels and locations', addLabel: 'Add Inventory' },
  orders: { title: 'Orders', subtitle: 'Manage sales orders', addLabel: 'Create Order' },
  customers: { title: 'Customers', subtitle: 'Customer management', addLabel: 'Add Customer' },
  payments: { title: 'Payments', subtitle: 'Payment processing and tracking', addLabel: 'Add Payment' },
  returns: { title: 'Returns', subtitle: 'Handle returns and refunds', addLabel: 'Process Return' },
  discounts: { title: 'Discounts', subtitle: 'Manage promotions and discounts', addLabel: 'Create Discount' },
  suppliers: { title: 'Suppliers', subtitle: 'Supplier management', addLabel: 'Add Supplier' },
  'barcode-generator': { title: 'Barcode Generator', subtitle: 'Generate and manage barcodes', addLabel: 'Generate Barcode' },
  workspace: { title: 'Personal Workspace', subtitle: 'Chat with your team and manage tasks' },
  team: { title: 'Team Management', subtitle: 'Your team members' },
  analytics: { title: 'Analytics', subtitle: 'Performance reports' },
  'company-settings': { title: 'Company Settings', subtitle: 'Manage your company details' },
};

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
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [addAutoLeadOpen, setAddAutoLeadOpen] = useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addTestDriveOpen, setAddTestDriveOpen] = useState(false);
  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [addFinanceOpen, setAddFinanceOpen] = useState(false);
  const [addInsuranceOpen, setAddInsuranceOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [addDiscountOpen, setAddDiscountOpen] = useState(false);
  const [addReturnOpen, setAddReturnOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  
const { data: industry, isLoading: industryLoading, isLoaded } = useIndustry();
if (industryLoading || !isLoaded) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full border-4 border-muted w-16 h-16 border-t-primary" />
    </div>
  );
}
const isEducation = industry === 'education';
const isHealthcare = industry === 'healthcare';
const isAutomobileDealers = industry === 'automobile_dealers';
const isOnlineBusiness = industry === 'online_business';
const tabConfig = isEducation ? educationTabConfig :
  isHealthcare ? healthcareTabConfig :
  isAutomobileDealers ? automobileTabConfig :
  isOnlineBusiness ? onlineBusinessTabConfig :
  realEstateTabConfig;

  const handleAddNew = () => {
    switch (activeTab) {
      case 'leads':
        if (isAutomobileDealers) {
          setAddAutoLeadOpen(true);
        } else {
        setAddLeadOpen(true);
        }
        break;
      case 'properties':
        setAddPropertyOpen(true);
        break;
      case 'employees':
        if (!isHealthcare && !isOnlineBusiness) {
          setAddEmployeeOpen(true);
        }
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
      case 'patients':
        setAddPatientOpen(true);
        break;
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
      // Online Business cases
      case 'products':
        if (isOnlineBusiness) {
          setAddProductOpen(true);
        }
        break;
      case 'customers':
        if (isOnlineBusiness) {
          setAddCustomerOpen(true);
        }
        break;
      case 'suppliers':
        if (isOnlineBusiness) {
          setAddSupplierOpen(true);
        }
        break;
      case 'orders':
        if (isOnlineBusiness) {
          setAddOrderOpen(true);
        }
        break;
      case 'payments':
        if (isOnlineBusiness) {
          setAddPaymentOpen(true);
        }
        break;
      case 'discounts':
        if (isOnlineBusiness) {
          setAddDiscountOpen(true);
        }
        break;
      case 'returns':
        if (isOnlineBusiness) {
          setAddReturnOpen(true);
        }
        break;
      // More healthcare cases can be added here when dialogs are created
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
        case 'workspace':
          return <PersonalWorkspace />;
        case 'team':
          return <TeamView />;
        case 'analytics':
          return <EducationAnalytics />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <EducationDashboard />;
      }
    } else if (isHealthcare) {
      switch (activeTab) {
        case 'dashboard':
          return <HealthcareDashboard />;
        case 'patients':
          return <PatientsView />;
        case 'appointments':
          return <AppointmentsView />;
        case 'medical-records':
          return <MedicalRecordsView />;
        case 'prescriptions':
          return <PrescriptionsView />;
        case 'billing':
          return <BillingView />;
        case 'workspace':
          return <PersonalWorkspace />;
        case 'team':
          return <TeamView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <HealthcareDashboard />;
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
        case 'whatsapp-inbox':
          return <AutomobileWhatsAppInbox />;
        case 'workspace':
          return <PersonalWorkspace />;
        case 'team':
          return <TeamView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <AutomobileDashboard />;
      }
    } else if (isOnlineBusiness) {
      switch (activeTab) {
        case 'dashboard':
          return <OnlineBusinessDashboard />;
        case 'products':
          return <ProductsView />;
        case 'inventory':
          return <InventoryView />;
        case 'orders':
          return <OrdersView />;
        case 'customers':
          return <CustomersView />;
        case 'payments':
          return <PaymentsView />;
        case 'returns':
          return <ReturnsView />;
        case 'discounts':
          return <DiscountsView />;
        case 'suppliers':
          return <SuppliersView />;
        case 'barcode-generator':
          return <BarcodeGenerator />;
        case 'workspace':
          return <PersonalWorkspace />;
        case 'team':
          return <TeamView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'company-settings':
          return <CompanySettingsView />;
        default:
          return <OnlineBusinessDashboard />;
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

      <main className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
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
      <AddCourseDialog open={addCourseOpen} onOpenChange={setAddCourseOpen} />
      <AddBatchDialog open={addBatchOpen} onOpenChange={setAddBatchOpen} />
      <AddTeacherDialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen} />
      <AddPatientDialog open={addPatientOpen} onOpenChange={setAddPatientOpen} />
      <AddAutoLeadDialog open={addAutoLeadOpen} onOpenChange={setAddAutoLeadOpen} />
      <AddVehicleDialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen} />
      <AddTestDriveDialog open={addTestDriveOpen} onOpenChange={setAddTestDriveOpen} />
      <AddBookingDialog open={addBookingOpen} onOpenChange={setAddBookingOpen} />
      <AddDealDialog open={addDealOpen} onOpenChange={setAddDealOpen} />
      <AddFinanceDialog open={addFinanceOpen} onOpenChange={setAddFinanceOpen} />
      <AddInsuranceDialog open={addInsuranceOpen} onOpenChange={setAddInsuranceOpen} />

      {/* Online Business Dialogs */}
      <AddProductDialog open={addProductOpen} onOpenChange={setAddProductOpen} />
      <AddCustomerDialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen} />
      <AddSupplierDialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen} />
      <AddOrderDialog open={addOrderOpen} onOpenChange={setAddOrderOpen} />
      <AddPaymentDialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen} />
      <AddDiscountDialog open={addDiscountOpen} onOpenChange={setAddDiscountOpen} />
      <AddReturnDialog open={addReturnOpen} onOpenChange={setAddReturnOpen} />
      <AddEmployeeDialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen} />

      {!isEducation && !isHealthcare && !isAutomobileDealers && !isOnlineBusiness && <AIChatAssistant />}
    </div>
  );
};

export default Index;
