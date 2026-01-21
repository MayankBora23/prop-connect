import { useTestDrives } from '@/hooks/useTestDrives';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Download, Upload, Calendar, Car, User, Edit, Trash2, Clock, Check, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDeleteTestDrive, useUpdateTestDrive } from '@/hooks/useTestDrives';
import { ScheduleTestDriveDialog } from './ScheduleTestDriveDialog';
import { EditTestDriveDialog } from './EditTestDriveDialog';
import { toast } from 'sonner';
import { useState } from 'react';
import type { TestDriveWithRelations } from '@/hooks/useAutoTypes';

export function TestDrivesView() {
  const { data: testDrives, isLoading: testDrivesLoading } = useTestDrives();
  const { data: leads, isLoading: leadsLoading } = useAutoLeads();
  const deleteTestDrive = useDeleteTestDrive();
  const updateTestDrive = useUpdateTestDrive();
  const [scheduleTestDriveOpen, setScheduleTestDriveOpen] = useState(false);
  const [selectedLeadForScheduling, setSelectedLeadForScheduling] = useState<{ id: string; name: string; phone?: string; email?: string } | null>(null);
  const [editTestDriveOpen, setEditTestDriveOpen] = useState(false);
  const [selectedTestDriveForEdit, setSelectedTestDriveForEdit] = useState<TestDriveWithRelations | null>(null);

  // Get leads that are scheduled for test drives
  const scheduledLeads = leads?.filter(lead => lead.status === 'test_drive_scheduled') || [];

  // Filter test drives by status
  const scheduledTestDrives = (testDrives || []).filter(td => td.status === 'scheduled');
  const completedTestDrives = (testDrives || []).filter(td => td.status === 'completed');
  const cancelledTestDrives = (testDrives || []).filter(td => td.status === 'cancelled');
  const noShowTestDrives = (testDrives || []).filter(td => td.status === 'no_show');

  const isLoading = testDrivesLoading || leadsLoading;

  const getTestDriveStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async (testDriveId: string, newStatus: 'completed' | 'cancelled' | 'no_show', customerName: string) => {
    try {
      await updateTestDrive.mutateAsync({
        id: testDriveId,
        status: newStatus,
      });

      toast.success(`Test drive marked as ${newStatus.replace('_', ' ')}`, {
        description: `Test drive for ${customerName} has been updated.`,
      });
    } catch (error: any) {
      console.error('Status update error:', error);
      toast.error('Failed to update test drive status', {
        description: error?.message || 'Please try again.',
      });
    }
  };


  const TestDriveCard = ({ testDrive, showQuickActions = false }: { testDrive: any, showQuickActions?: boolean }) => (
    <div className="card-elevated p-4 animate-scale-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {(testDrive.auto_leads?.name || testDrive.driver_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">
              {testDrive.auto_leads?.name || testDrive.driver_name || 'Unknown Customer'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {testDrive.auto_leads?.phone || testDrive.driver_phone || 'No phone'}
            </p>
          </div>
        </div>
        <Badge className={getTestDriveStatusColor(testDrive.status)}>
          {testDrive.status}
        </Badge>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4" />
          <span className="text-xs">
            {testDrive.vehicles?.year} {testDrive.vehicles?.brand} {testDrive.vehicles?.model}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span className="text-xs">{testDrive.test_drive_date} at {testDrive.test_drive_time}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="text-xs">Driver: {testDrive.driver_name}</span>
        </div>
      </div>

      {testDrive.feedback && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">{testDrive.feedback}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        {showQuickActions ? (
          <div className="grid grid-cols-4 gap-2">
            {testDrive.status !== 'completed' && (
              <Button
                size="sm"
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
                onClick={() => handleStatusUpdate(testDrive.id, 'completed', testDrive.auto_leads?.name || testDrive.driver_name || 'Unknown Customer')}
                disabled={updateTestDrive.isPending}
                title="Mark as Completed"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            {testDrive.status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800"
                onClick={() => handleStatusUpdate(testDrive.id, 'cancelled', testDrive.auto_leads?.name || testDrive.driver_name || 'Unknown Customer')}
                disabled={updateTestDrive.isPending}
                title="Mark as Cancelled"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {testDrive.status !== 'no_show' && (
              <Button
                size="sm"
                variant="outline"
                className="bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-800"
                onClick={() => handleStatusUpdate(testDrive.id, 'no_show', testDrive.auto_leads?.name || testDrive.driver_name || 'Unknown Customer')}
                disabled={updateTestDrive.isPending}
                title="Mark as No Show"
              >
                <Clock className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedTestDriveForEdit(testDrive);
                setEditTestDriveOpen(true);
              }}
              title="Edit Details"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Test Drive</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this test drive for {testDrive.auto_leads?.name || testDrive.driver_name || 'Unknown Customer'}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(testDrive.id, testDrive.auto_leads?.name || testDrive.driver_name || 'Unknown Customer')}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );

  const TestDrivesTable = ({ items, showQuickActions = false }: { items: any[]; showQuickActions?: boolean }) => (
    <div className="overflow-auto bg-card border rounded-md">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Vehicle</th>
            <th className="px-4 py-3">Date & Time</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.length > 0 ? (
            items.map((td) => (
              <tr key={td.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{td.id?.slice(-6) || td.id}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                      {(td.auto_leads?.name || td.driver_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{td.auto_leads?.name || td.driver_name || 'Unknown Customer'}</p>
                      <p className="text-xs text-muted-foreground">{td.auto_leads?.phone || td.driver_phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{td.vehicles?.year} {td.vehicles?.brand} {td.vehicles?.model}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{td.test_drive_date} at {td.test_drive_time}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge className={getStatusColor(td.status)}>{td.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {showQuickActions ? (
                    <div className="flex items-center gap-2">
                      {td.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
                          onClick={() => handleStatusUpdate(td.id, 'completed', td.auto_leads?.name || td.driver_name || 'Unknown Customer')}
                          disabled={updateTestDrive.isPending}
                          title="Mark as Completed"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {td.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800"
                          onClick={() => handleStatusUpdate(td.id, 'cancelled', td.auto_leads?.name || td.driver_name || 'Unknown Customer')}
                          disabled={updateTestDrive.isPending}
                          title="Mark as Cancelled"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {td.status !== 'no_show' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-800"
                          onClick={() => handleStatusUpdate(td.id, 'no_show', td.auto_leads?.name || td.driver_name || 'Unknown Customer')}
                          disabled={updateTestDrive.isPending}
                          title="Mark as No Show"
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTestDriveForEdit(td);
                          setEditTestDriveOpen(true);
                        }}
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Test Drive</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this test drive for {td.auto_leads?.name || td.driver_name || 'Unknown Customer'}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(td.id, td.auto_leads?.name || td.driver_name || 'Unknown Customer')}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={6}>No records</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const handleDelete = async (testDriveId: string, customerName: string) => {
    try {
      await deleteTestDrive.mutateAsync(testDriveId);
      toast.success(`Test drive for ${customerName} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete test drive for ${customerName}`);
    }
  };

  const handleTestDriveScheduled = () => {
    // Refresh the leads data to update the pipeline section
    // The lead status will be updated to 'quotation_shared' so it won't appear in scheduled leads anymore
    setSelectedLeadForScheduling(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Test Drives</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Pipeline Leads Section */}
      {scheduledLeads.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">Leads Scheduled for Test Drive</h3>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {scheduledLeads.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledLeads.map((lead) => (
              <div key={lead.id} className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {lead.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                    <h4 className="font-semibold text-foreground text-sm">{lead.name}</h4>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      </div>
                    </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>📧 {lead.email || 'No email'}</p>
                  <p>🚗 {lead.preferred_brand || 'No preference'} {lead.preferred_model || ''}</p>
                  <p>💰 ₹{lead.budget_min?.toLocaleString()} - ₹{lead.budget_max?.toLocaleString()}</p>
                      </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gradient-primary border-0"
                    onClick={() => {
                      setSelectedLeadForScheduling({
                        id: lead.id,
                        name: lead.name,
                        phone: lead.phone,
                        email: lead.email
                      });
                      setScheduleTestDriveOpen(true);
                    }}
                  >
                    Schedule Test Drive
                  </Button>
                      </div>
                    </div>
            ))}
                      </div>
                    </div>
      )}

      {/* Test Drives List */}
      {/* Scheduled Test Drives */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Scheduled Test Drives ({scheduledTestDrives.length})
        </h3>
        <TestDrivesTable items={scheduledTestDrives} showQuickActions={true} />
      </div>

      {/* Completed Test Drives */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Completed Test Drives ({completedTestDrives.length})
        </h3>
        <TestDrivesTable items={completedTestDrives} showQuickActions={true} />
      </div>

      {/* Cancelled Test Drives */}
      {cancelledTestDrives.length > 0 && (
                      <div>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Cancelled Test Drives ({cancelledTestDrives.length})
          </h3>
          <TestDrivesTable items={cancelledTestDrives} showQuickActions={true} />
                    </div>
      )}

      {/* No Show Test Drives */}
      {noShowTestDrives.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            No Show Test Drives ({noShowTestDrives.length})
          </h3>
          <TestDrivesTable items={noShowTestDrives} showQuickActions={true} />
        </div>
      )}

      {/* Schedule Test Drive Dialog */}
      <ScheduleTestDriveDialog
        lead={selectedLeadForScheduling}
        open={scheduleTestDriveOpen}
        onOpenChange={(open) => {
          setScheduleTestDriveOpen(open);
          if (!open) {
            setSelectedLeadForScheduling(null);
          }
        }}
        onScheduled={handleTestDriveScheduled}
      />

      {/* Edit Test Drive Dialog */}
      <EditTestDriveDialog
        testDrive={selectedTestDriveForEdit}
        open={editTestDriveOpen}
        onOpenChange={(open) => {
          setEditTestDriveOpen(open);
          if (!open) {
            setSelectedTestDriveForEdit(null);
          }
        }}
      />
    </div>
  );
}
