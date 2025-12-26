import React from 'react';
import { Phone, Mail, Calendar, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/hooks/usePatients';
import { format } from 'date-fns';

interface PatientCardProps {
  patient: Patient;
  onDragStart?: () => void;
  isDragging?: boolean;
}

export function PatientCard({ patient, onDragStart, isDragging = false }: PatientCardProps) {
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className={cn(
        "card-elevated p-4 cursor-grab hover:shadow-lg transition-all duration-200 animate-scale-in",
        isDragging && "opacity-50 rotate-2 scale-105"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{patient.name}</h4>
            <p className="text-xs text-muted-foreground">{patient.email || patient.phone}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" />
          <span>{patient.phone}</span>
        </div>

        {patient.medical_id && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            <span className="font-mono">ID: {patient.medical_id}</span>
          </div>
        )}

        {patient.blood_type && (
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5" />
            <span>Blood: {patient.blood_type}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(patient.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {patient.date_of_birth && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">DOB</span>
            <span className="text-xs font-semibold text-primary">
              {new Date(patient.date_of_birth).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {(patient.allergies?.length > 0 || patient.medical_conditions?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {patient.allergies && patient.allergies.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800">
              Allergies ({patient.allergies.length})
            </span>
          )}
          {patient.medical_conditions && patient.medical_conditions.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
              Conditions ({patient.medical_conditions.length})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
