import React from 'react';
import { Phone, Mail, MapPin, Calendar, User, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Student } from '@/hooks/useStudents';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface StudentCardProps {
  student: Student;
  onClick?: () => void;
  onDragStart?: () => void;
  isDragging?: boolean;
  onOpenHistory?: () => void;
}

export function StudentCard({ student, onClick, onDragStart, isDragging = false, onOpenHistory }: StudentCardProps) {
  return (
    <div
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className={cn(
        "card-elevated p-4 cursor-pointer hover:shadow-lg transition-all duration-200 animate-scale-in",
        isDragging && "opacity-50 rotate-2 scale-105"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {student.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{student.name}</h4>
            <p className="text-xs text-muted-foreground">{student.email || 'No email'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" />
          <span>{student.phone}</span>
        </div>
        {student.parent_name && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            <span>{student.parent_name}</span>
          </div>
        )}
        {student.address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{student.address}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(student.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {student.date_of_birth && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">DOB</span>
            <span className="text-xs font-semibold text-primary">
              {new Date(student.date_of_birth).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {student.tags && student.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {student.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                'bg-secondary text-secondary-foreground'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {onOpenHistory && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory();
            }}
            title="History"
          >
            <History className="w-3 h-3 mr-1" />
            History
          </Button>
        </div>
      )}
    </div>
  );
}
