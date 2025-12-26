import { useState } from 'react';
import { usePatients, Patient } from '@/hooks/usePatients';
import { PatientCard } from './PatientCard';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Enums } from '@/integrations/supabase/types';
import { useUpdatePatient } from '@/hooks/usePatients';

type PatientStage = Enums<'patient_stage'>;

const stages: { id: PatientStage; label: string; color: string }[] = [
  { id: 'new_patient_inquiry', label: 'New Inquiry', color: 'bg-info' },
  { id: 'appointment_scheduled', label: 'Appointment Set', color: 'bg-primary' },
  { id: 'checked_in_visit_started', label: 'In Consultation', color: 'bg-warning' },
  { id: 'consultation_treatment_completed', label: 'Treatment Done', color: 'bg-success' },
  { id: 'billing_payment_pending', label: 'Billing Pending', color: 'bg-warning' },
  { id: 'payment_completed', label: 'Completed', color: 'bg-success' },
  { id: 'follow_up_scheduled', label: 'Follow-up Set', color: 'bg-primary' },
];

export function PatientPipeline() {
  const { data: patients, isLoading } = usePatients();
  const updatePatient = useUpdatePatient();
  const [draggedPatient, setDraggedPatient] = useState<Patient | null>(null);

  const getPatientsByStage = (stage: PatientStage) => {
    return (patients || []).filter((patient) => patient.stage === stage);
  };

  const handleDragStart = (patient: Patient) => {
    setDraggedPatient(patient);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, newStage: PatientStage) => {
    e.preventDefault();
    if (draggedPatient && draggedPatient.stage !== newStage) {
      updatePatient.mutate({ id: draggedPatient.id, stage: newStage });
    }
    setDraggedPatient(null);
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                <span className="ml-auto bg-secondary text-secondary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                  {getPatientsByStage(stage.id).length}
                </span>
              </div>
              <div className="space-y-3 min-h-[200px] p-2 rounded-xl bg-secondary/50">
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {stages.map((stage) => {
          const stagePatients = getPatientsByStage(stage.id);
          return (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                <span className="ml-auto bg-secondary text-secondary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                  {stagePatients.length}
                </span>
              </div>
              <div
                className="space-y-3 min-h-[200px] p-2 rounded-xl bg-secondary/50 transition-colors hover:bg-secondary/70"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {stagePatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onDragStart={() => handleDragStart(patient)}
                    isDragging={draggedPatient?.id === patient.id}
                  />
                ))}
                {stagePatients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No patients in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
