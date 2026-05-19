import { useState } from 'react';
import { useStudents, Student } from '@/hooks/useStudents';
import { StudentCard } from './StudentCard';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Enums } from '@/integrations/supabase/types';
import { useUpdateStudent } from '@/hooks/useStudents';

type StudentStage = 'new_students' | 'contacted' | 'demo_scheduled' | 'demo_attended' | 'interested' | 'fees_discussed' | 'enrolled' | 'lost';

const stages: { id: StudentStage; label: string; color: string }[] = [
  { id: 'new_students', label: 'New Students', color: 'bg-info' },
  { id: 'contacted', label: 'Contacted', color: 'bg-primary' },
  { id: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-warning' },
  { id: 'demo_attended', label: 'Demo Attended', color: 'bg-success' },
  { id: 'interested', label: 'Interested', color: 'bg-success' },
  { id: 'fees_discussed', label: 'Fees Discussed', color: 'bg-warning' },
  { id: 'enrolled', label: 'Enrolled', color: 'bg-success' },
  { id: 'lost', label: 'Lost', color: 'bg-destructive' },
];

export function StudentPipeline() {
  const { data: students, isLoading } = useStudents();
  const updateStudent = useUpdateStudent();
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);

  const getStudentsByStage = (stage: StudentStage) => {
    return (students || []).filter((student) => student.stage === stage);
  };

  const handleDragStart = (student: Student) => {
    setDraggedStudent(student);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, newStage: StudentStage) => {
    e.preventDefault();
    if (draggedStudent && draggedStudent.stage !== newStage) {
      updateStudent.mutate({ id: draggedStudent.id, stage: newStage });
    }
    setDraggedStudent(null);
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
              </div>
              <div className="space-y-3 min-h-[200px] p-2 rounded-xl bg-secondary/50">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
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
          const stageStudents = getStudentsByStage(stage.id);
          return (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                <span className="ml-auto bg-secondary text-secondary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                  {stageStudents.length}
                </span>
              </div>
              <div
                className="space-y-3 min-h-[200px] p-2 rounded-xl bg-secondary/50 transition-colors hover:bg-secondary/70"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {stageStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onDragStart={() => handleDragStart(student)}
                    isDragging={draggedStudent?.id === student.id}
                  />
                ))}
                {stageStudents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No students in this stage
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
