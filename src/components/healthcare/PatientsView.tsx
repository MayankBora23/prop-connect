import { useState } from 'react';
import { PatientPipeline } from './PatientPipeline';
import { usePatients, useUpdatePatient } from '@/hooks/usePatients';
import { LayoutGrid, List, Filter, Download, Upload, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Patient } from '@/hooks/usePatients';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDeletePatient } from '@/hooks/usePatients';
import { EditPatientDialog } from './EditPatientDialog';

export function PatientsView() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [editPatientDialogOpen, setEditPatientDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { data: patients, isLoading } = usePatients();
  const updatePatient = useUpdatePatient();
  const deletePatient = useDeletePatient();
  const { toast } = useToast();

  const stageOptions = [
    { value: 'new_patient_inquiry', label: 'New Patient / Inquiry' },
    { value: 'appointment_scheduled', label: 'Appointment Scheduled' },
    { value: 'checked_in_visit_started', label: 'Checked-In / Visit Started' },
    { value: 'consultation_treatment_completed', label: 'Consultation / Treatment Completed' },
    { value: 'billing_payment_pending', label: 'Billing & Payment Pending' },
    { value: 'payment_completed', label: 'Payment Completed' },
    { value: 'follow_up_scheduled', label: 'Follow-Up Scheduled' },
  ];

  const handleStageChange = (patientId: string, newStage: string) => {
    updatePatient.mutate(
      { id: patientId, stage: newStage as any },
      {
        onSuccess: () => {
          toast({
            title: 'Stage updated',
            description: 'Patient stage has been updated successfully.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Error updating stage',
            description: error.message || 'Failed to update patient stage.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setEditPatientDialogOpen(true);
  };

  const handleDeletePatient = (patientId: string, patientName: string) => {
    deletePatient.mutate(patientId, {
      onSuccess: () => {
        toast({
          title: 'Patient deleted',
          description: `${patientName} has been deleted successfully.`,
        });
      },
      onError: (error) => {
        toast({
          title: 'Error deleting patient',
          description: error.message || 'Failed to delete patient.',
          variant: 'destructive',
        });
      },
    });
  };

  const getAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStageLabel = (stage: string) => {
    const stageLabels: Record<string, string> = {
      'new_patient_inquiry': 'New Patient / Inquiry',
      'appointment_scheduled': 'Appointment Scheduled',
      'checked_in_visit_started': 'Checked-In / Visit Started',
      'consultation_treatment_completed': 'Consultation / Treatment Completed',
      'billing_payment_pending': 'Billing & Payment Pending',
      'payment_completed': 'Payment Completed',
      'follow_up_scheduled': 'Follow-Up Scheduled',
    };
    return stageLabels[stage] || stage;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'pipeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pipeline')}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Pipeline
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'pipeline' ? (
        <PatientPipeline />
      ) : (
        <div className="card-elevated overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medical ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medical Info</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-12 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  </tr>
                ))
              ) : (patients || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No patients found. Add your first patient to get started.
                  </td>
                </tr>
              ) : (
                (patients || []).map((patient) => (
                  <tr key={patient.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                          {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{patient.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getAge(patient.date_of_birth)} {patient.gender && `(${patient.gender})`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <div>
                        <p>{patient.phone}</p>
                        {patient.email && (
                          <p className="text-xs text-muted-foreground">{patient.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <span className="font-mono text-xs bg-secondary px-2 py-1 rounded">
                        {patient.medical_id || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <div className="space-y-1">
                        {patient.blood_type && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Blood:</span>
                            <span className="font-medium">{patient.blood_type}</span>
                          </div>
                        )}
                        {patient.medical_conditions && patient.medical_conditions.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Conditions:</span>
                            <span className="text-xs">{patient.medical_conditions.slice(0, 2).join(', ')}{patient.medical_conditions.length > 2 && '...'}</span>
                          </div>
                        )}
                        {patient.allergies && patient.allergies.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Allergies:</span>
                            <span className="text-xs">{patient.allergies.slice(0, 2).join(', ')}{patient.allergies.length > 2 && '...'}</span>
                          </div>
                        )}
                        {!patient.blood_type && (!patient.medical_conditions || patient.medical_conditions.length === 0) && (!patient.allergies || patient.allergies.length === 0) && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={patient.stage}
                        onValueChange={(value) => handleStageChange(patient.id, value)}
                        disabled={updatePatient.isPending}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPatient(patient);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {patient.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePatient(patient.id, patient.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <EditPatientDialog
        patient={selectedPatient}
        open={editPatientDialogOpen}
        onOpenChange={setEditPatientDialogOpen}
      />
    </div>
  );
}
