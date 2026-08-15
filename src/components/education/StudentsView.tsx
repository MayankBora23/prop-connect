import { useState, useMemo } from 'react';
import { StudentPipeline } from './StudentPipeline';
import { useStudents } from '@/hooks/useStudents';
import { LayoutGrid, List, Filter, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

import { useProfiles } from '@/hooks/useProfiles';
import { useCreateStudent, useUpdateStudent, useDeleteStudent } from '@/hooks/useStudents';
import { useCreateWhatsAppConversation } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditStudentDialog } from './EditStudentDialog';
import { Edit, Trash2, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import type { Student } from '@/hooks/useStudents';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';
import { ImportCSVDialog } from '@/components/leads/ImportCSVDialog';
import type { FieldDef } from '@/components/leads/ImportCSVDialog';
import { generateCSV, downloadCSV, normalizePhone } from '@/lib/csvUtils';

const STUDENT_FIELD_DEFS: FieldDef[] = [
  { key: 'Name', label: 'Name', required: true, aliases: ['name', 'fullname', 'studentname', 'studentfullname', 'clientname', 'contactname', 'firstname'] },
  { key: 'Phone', label: 'Phone / Mobile', required: true, aliases: ['phone', 'phoneno', 'phonenumber', 'mobile', 'mobileno', 'mobilenumber', 'contact', 'contactno', 'cell', 'whatsapp', 'ph', 'number'] },
  { key: 'Email', label: 'Email', required: false, aliases: ['email', 'emailaddress', 'emailid', 'mail'] },
  { key: 'Date of Birth', label: 'Date of Birth', required: false, aliases: ['dateofbirth', 'dob', 'birthdate', 'birthday', 'bod'] },
  { key: 'Address', label: 'Address', required: false, aliases: ['address', 'location', 'city', 'area'] },
  { key: 'Parent Name', label: 'Parent Name', required: false, aliases: ['parentname', 'fathername', 'mothername', 'guardianname', 'parent', 'guardian'] },
  { key: 'Parent Phone', label: 'Parent Phone', required: false, aliases: ['parentphone', 'parentphoneno', 'parentmobile', 'fatherphone', 'motherphone', 'guardianphone', 'parentcontact'] },
  { key: 'Parent Email', label: 'Parent Email', required: false, aliases: ['parentemail', 'fatheremail', 'motheremail', 'guardianemail'] },
  { key: 'Stage', label: 'Stage / Status', required: false, aliases: ['stage', 'status', 'leadstage'] },
];

function AssignStudentSelect({ studentId, assignedTo }: { studentId: string, assignedTo?: string }) {
  const { data: profiles, isLoading } = useProfiles();
  const updateStudent = useUpdateStudent();

  return (
    <Select
      value={assignedTo ?? 'unassigned'}
      onValueChange={value => {
        updateStudent.mutate({ id: studentId, assigned_to: value === 'unassigned' ? null : value });
      }}
      disabled={isLoading || updateStudent.isPending}
    >
      <SelectTrigger className="h-7 w-40 text-xs bg-background">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {(profiles || []).map(profile => (
          <SelectItem key={profile.user_id} value={profile.user_id}>
            {profile.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const stageOptions = [
  { value: 'new_students', label: 'New Students' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'demo_scheduled', label: 'Demo Scheduled' },
  { value: 'demo_attended', label: 'Demo Attended' },
  { value: 'interested', label: 'Interested' },
  { value: 'fees_discussed', label: 'Fees Discussed' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'lost', label: 'Lost' },
];

function StageSelect({ studentId, stage }: { studentId: string, stage: string }) {
  const updateStudent = useUpdateStudent();
  return (
    <Select
      value={stage}
      onValueChange={value => updateStudent.mutate({ id: studentId, stage: value as any })}
      disabled={updateStudent.isPending}
    >
      <SelectTrigger className="h-7 w-36 text-xs bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {stageOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StudentsView() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { data: students, isLoading } = useStudents();
  const deleteStudent = useDeleteStudent();
  const createStudent = useCreateStudent();
  const createWhatsAppConversation = useCreateWhatsAppConversation();
  const { search } = useSectionSearch();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const filteredStudents = useMemo(
    () =>
      filterBySearch(students, search, (student) => [
        student.name,
        student.phone,
        student.email,
        student.parent_name,
        student.parent_phone,
        student.parent_email,
        student.stage,
      ]),
    [students, search]
  );

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setEditDialogOpen(true);
  };

  const handleDelete = async (studentId: string, studentName: string) => {
    try {
      await deleteStudent.mutateAsync(studentId);
      toast.success(`${studentName} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${studentName}`);
    }
  };

  const checkExistingConversation = async (phoneNumber: string, companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, contact_name')
        .eq('contact_phone', phoneNumber)
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing conversation:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in checkExistingConversation:', error);
      return null;
    }
  };

  const updateConversationName = async (conversationId: string, contactName: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ contact_name: contactName })
        .eq('id', conversationId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating conversation name:', error);
      throw error;
    }
  };

  const handleAddToWhatsApp = async (student: Student) => {
    try {
      // Validate required fields
      if (!student.phone || !student.name) {
        toast.error('Student phone and name are required');
        return;
      }

      // Validate company_id
      if (!student.company_id) {
        toast.error('Student company information is missing');
        return;
      }

      // Format phone number with +91 country code if not already present
      const phoneNumber = student.phone.startsWith('+91') ? student.phone : `+91${student.phone}`;

      // Check if conversation with this phone number already exists
      const existingConversation = await checkExistingConversation(phoneNumber, student.company_id);

      if (existingConversation) {
        // If conversation exists but has no name, update it
        if (!existingConversation.contact_name || existingConversation.contact_name.trim() === '') {
          await updateConversationName(existingConversation.id, student.name);
          toast.success(`Contact name updated for ${phoneNumber}`);
        } else {
          // If conversation exists and already has a name, show message
          toast.info(`Contact ${phoneNumber} already exists in WhatsApp inbox`);
        }
        return;
      }

      // Create new conversation if it doesn't exist
      await createWhatsAppConversation.mutateAsync({
        contact_phone: phoneNumber,
        contact_name: student.name,
        company_id: student.company_id,
        last_message_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error adding student to WhatsApp:', error);
      toast.error('Failed to add student to WhatsApp');
    }
  };

  const updateStudentMutation = useUpdateStudent();

  const handleAddToTelephony = async (student: Student) => {
    try {
      await updateStudentMutation.mutateAsync({
        id: student.id,
        is_telephony_enabled: true
      });
      toast.success('Student enabled for telephony');
    } catch (error) {
      console.error('Error enabling telephony for student:', error);
      toast.error('Failed to enable telephony for student');
    }
  };

  const handleImport = async (data: Record<string, string>[]) => {
    let successCount = 0;
    const errors: string[] = [];

    for (const row of data) {
      // Rows are pre-keyed by the column-mapping dialog (canonical keys)
      const name = row['Name'];
      const phone = row['Phone'];
      const email = row['Email'];
      const date_of_birth = row['Date of Birth'];
      const address = row['Address'];
      const parent_name = row['Parent Name'];
      const parent_phone = row['Parent Phone'];
      const parent_email = row['Parent Email'];
      const stage = row['Stage'];

      if (!name || !phone) {
        errors.push(`Row missing required fields (Name and Phone)`);
        continue;
      }

      const validStages = ['new_students', 'contacted', 'demo_scheduled', 'demo_attended', 'interested', 'fees_discussed', 'enrolled', 'lost'];
      const normalizedStage = stage && validStages.includes(stage.toLowerCase())
        ? (stage.toLowerCase() as any)
        : 'new_students';

      try {
        await createStudent.mutateAsync({
          name: name.trim(),
          phone: normalizePhone(phone),
          email: email?.trim() || null,
          date_of_birth: date_of_birth?.trim() || null,
          address: address?.trim() || null,
          parent_name: parent_name?.trim() || null,
          parent_phone: parent_phone ? normalizePhone(parent_phone) : null,
          parent_email: parent_email?.trim() || null,
          stage: normalizedStage,
          created_by: null,
          notes: [],
          tags: [],
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Failed to import ${name}: ${err.message || 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.error(errors);
      if (successCount === 0) {
        throw new Error(`All imports failed. e.g. ${errors[0]}`);
      } else {
        toast.warning(`Imported ${successCount} students, but ${errors.length} failed.`);
      }
    }
  };

  const handleExport = () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('No students available to export');
      return;
    }
    const headers = [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'date_of_birth', label: 'Date of Birth' },
      { key: 'address', label: 'Address' },
      { key: 'parent_name', label: 'Parent Name' },
      { key: 'parent_phone', label: 'Parent Phone' },
      { key: 'parent_email', label: 'Parent Email' },
      { key: 'stage', label: 'Stage' },
      { key: 'created_at', label: 'Created At' },
    ];
    const formattedStudents = filteredStudents.map(student => ({
      ...student,
      phone: student.phone ? `\u200B${student.phone}` : '',
      parent_phone: student.parent_phone ? `\u200B${student.parent_phone}` : '',
      date_of_birth: student.date_of_birth ? format(new Date(student.date_of_birth), 'yyyy-MM-dd') : '',
      created_at: student.created_at ? format(new Date(student.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    }));
    const csvContent = generateCSV(headers, formattedStudents);
    downloadCSV(csvContent, 'students.csv');
    toast.success('Students exported successfully');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={viewMode === 'pipeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pipeline')}
            className="flex-1 sm:flex-none"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Pipeline
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="flex-1 sm:flex-none"
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="flex-1 sm:flex-none">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <ImportCSVDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        sampleHeaders={['Name', 'Phone', 'Email', 'Date of Birth', 'Address', 'Parent Name', 'Parent Phone', 'Parent Email', 'Stage']}
        fieldDefs={STUDENT_FIELD_DEFS}
        title="Import Students"
        templateFileName="students_template.csv"
      />

      {/* Content */}
      {viewMode === 'pipeline' ? (
        <StudentPipeline />
      ) : (
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent Info</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Birth</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))
            ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {search.trim() ? 'No students match your search.' : 'No students found. Add your first student to get started.'}
                  </td>
                </tr>
              ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.email || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{student.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    {student.parent_name ? (
                      <>
                        <p className="text-sm text-foreground">{student.parent_name}</p>
                        <p className="text-xs text-muted-foreground">{student.parent_phone || '-'}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">-</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '-'}
                  </td>
                    <td className="px-4 py-3">
                      <AssignStudentSelect studentId={student.id} assignedTo={student.assigned_to} />
                    </td>
                    <td className="px-4 py-3">
                      <StageSelect studentId={student.id} stage={student.stage} />
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {format(new Date(student.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWhatsApp(student);
                          }}
                          title="Add to WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToTelephony(student);
                          }}
                          title="Add to Telephony"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(student);
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
                              <AlertDialogTitle>Delete Student</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {student.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(student.id, student.name)}
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
      </div>
      )}

      {/* Edit Dialog */}
      <EditStudentDialog
        student={selectedStudent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}

