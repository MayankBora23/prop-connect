import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreatePatient } from '@/hooks/usePatients';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Enums } from '@/integrations/supabase/types';

const patientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().trim().max(500, 'Address must be less than 500 characters').optional().or(z.literal('')),
  medical_id: z.string().trim().max(50, 'Medical ID must be less than 50 characters').optional().or(z.literal('')),
  blood_type: z.string().optional(),
  emergency_contact_name: z.string().trim().max(100, 'Emergency contact name must be less than 100 characters').optional().or(z.literal('')),
  emergency_contact_phone: z.string().trim().min(10, 'Emergency contact phone must be at least 10 digits').max(15, 'Emergency contact phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format').optional().or(z.literal('')),
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
  insurance_provider: z.string().trim().max(100, 'Insurance provider must be less than 100 characters').optional().or(z.literal('')),
  stage: z.enum(['new_patient_inquiry', 'appointment_scheduled', 'checked_in_visit_started', 'consultation_treatment_completed', 'billing_payment_pending', 'payment_completed', 'follow_up_scheduled']).default('new_patient_inquiry'),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const coverageTypes = ['Cashless', 'Reimbursement'];
const genderOptions = ['Male', 'Female', 'Other'];

export function AddPatientDialog({ open, onOpenChange }: AddPatientDialogProps) {
  const { toast } = useToast();
  const createPatient = useCreatePatient();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      gender: '',
      address: '',
      medical_id: '',
      blood_type: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      allergies: '',
      medical_conditions: '',
      insurance_provider: '',
      stage: 'new_patient_inquiry',
    },
  });

  const onSubmit = async (data: PatientFormData) => {
    try {
      // Convert arrays from comma-separated strings
      const allergiesArray = data.allergies ? data.allergies.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
      const medicalConditionsArray = data.medical_conditions ? data.medical_conditions.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

      await createPatient.mutateAsync({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : null,
        gender: data.gender || null,
        address: data.address || null,
        medical_id: data.medical_id || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        blood_type: data.blood_type || null,
        allergies: allergiesArray.length > 0 ? allergiesArray : null,
        medical_conditions: medicalConditionsArray.length > 0 ? medicalConditionsArray : null,
        insurance_provider_name: data.insurance_provider || null,
        stage: data.stage,
      });

      toast({
        title: 'Patient created',
        description: `${data.name} has been added successfully.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create patient error:', error);
      const description = error?.message || error?.error || JSON.stringify(error) || 'Failed to create patient. Please try again.';
      toast({
        title: 'Error creating patient',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Fill in the patient details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter patient name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {genderOptions.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="blood_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bloodTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medical_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Patient ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter patient address" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergency_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact person name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergency_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Medical Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., penicillin, nuts, dust" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medical_conditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Known Conditions</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., diabetes, hypertension" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Insurance */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="insurance_provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="Insurance company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPatient.isPending} className="gradient-primary border-0">
                {createPatient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Patient
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
